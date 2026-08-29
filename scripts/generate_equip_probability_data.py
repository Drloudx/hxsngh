"""地图地块自带战斗的敌方装备遇见率模拟器。

统计两类可反复刷取的战斗：多格地块由 SandTable.GenerateBlockBattleEvent
预先生成的自带战斗，以及 RoleWeight 大于 0 的特殊一格地块探索后通过
ExploreEnd.GenerateBlockEvents 翻出的战斗。不统计异界传送门、星界秘境，
也不模拟战斗结算骰点。

正式版的完整地图布局和每个地块的战斗类型由 /Explore/StartExplore 服务端返回。
因此精确统计必须传入服务器地块样本；没有样本时，只能显式选择
area-spot-weighted 模式，按 Area_Spot 表权重近似合并两类战斗来源。
"""
import argparse
import json
import multiprocessing as mp
import os
import random
import time
from collections import Counter

MAP_LEVELS = {
    '新生平原': 100,
    '广袤草原': 110,
    '迷失森林': 120,
    '铁血高地': 130,
    '清凉沙滩': 140,
    '废弃矿洞': 140,
    '幽暗密林': 160,
    '荒凉戈壁': 170,
    '洞穴深处': 180,
    '遗忘之海': 200,
    '无尽荒漠': 210,
    '枯木丛林': 220,
    '极寒冰原': 110,
    '熔岩通道': 140,
}

MAP_NAME = '洞穴深处'
DIFF = MAP_LEVELS[MAP_NAME]

STEP_ORD = {'C': 1, 'B': 2, 'A': 3, 'S': 4, 'SS': 5}
STEP_LIST = ('C', 'B', 'A', 'S')
STEP_W = {'C': 10000, 'B': 1000, 'A': 100, 'S': 10}
BATTLE_TYPE_FILTER = {
    'Battle': {'常规', '稀有'},
    'NormalBattle': {'常规'},
    'RareBattle': {'稀有'},
}
SOURCE_BLOCK_BATTLE = 'block-battle'
SOURCE_EXPLORE_EVENT = 'explore-event'

# WeightTableHelper.eventStepWeightTable
EVENT_CORR = [
    [0, -0.7, -0.9, -1.0, 0],
    [-0.5, 0, -0.7, -0.9, 0],
    [-0.5, -0.5, 0, -0.7, 0],
    [-0.5, -0.5, -0.5, 0, 0]
]

# WeightTableHelper.prefixWeightTable
PREFIX_CORR = [
    [0.5, 0.5, 0, -0.5, 0],
    [-0.5, 0.5, 0.5, 0, 0],
    [-0.5, 0, 0.5, 0.5, 0],
    [-0.5, -0.5, 0.5, 0.5, 0]
]

SLOT_LIST = ['主手', '头部', '副手', '身体', '项链', '护手', '徽章', '腰带', '戒指', '鞋子']
CLASSES = ['战士', '法师', '射手', '牧师']
CLASS_POSITION = ['护卫', '战士', '巫医', '牧师', '游侠', '射手', '萨满', '法师']

def load_data():
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.join(project_dir, 'src', 'assets')

    return {
        'Equip': json.load(open(os.path.join(assets_dir, 'Equip.json'), encoding='utf-8')),
        'Role': json.load(open(os.path.join(assets_dir, 'Role.json'), encoding='utf-8')),
        'Battle_Event': json.load(open(os.path.join(assets_dir, 'Battle_Event.json'), encoding='utf-8')),
        'Difficulty_Spec': json.load(open(os.path.join(assets_dir, 'Difficulty_Spec.json'), encoding='utf-8')),
        'Prefix': json.load(open(os.path.join(assets_dir, 'Prefix.json'), encoding='utf-8')),
        'Bond': json.load(open(os.path.join(assets_dir, 'Bond.json'), encoding='utf-8')),
        'World_Map': json.load(open(os.path.join(assets_dir, 'World_Map.json'), encoding='utf-8')),
        'Area_Spot': json.load(open(os.path.join(assets_dir, 'Area_Spot.json'), encoding='utf-8')),
    }

def parse_bond_kv(s):
    if not s or '[' not in s:
        return ('', 0)
    parts = s.split('[')
    name = parts[0].strip()
    val_str = parts[1].rstrip(']').strip()
    try:
        val = int(val_str)
    except:
        val = 1
    return (name, val)

def wpick(ws):
    tot = sum(ws)
    if tot <= 0: return -1
    r = random.randrange(tot)
    for idx, w in enumerate(ws):
        if w <= 0: continue
        if r < w: return idx
        r -= w
    return len(ws) - 1

def range_random(value):
    text = str(value)
    if '-' not in text:
        return int(text)
    low, high = (int(part) for part in text.split('-', 1))
    return random.randint(low, high)

def roll_fractional_count(value, random_value=None):
    count = int(value)
    roll = random.random() if random_value is None else random_value
    if roll < value - count:
        count += 1
    return count


def get_block_prefix_count(block, difficulty_spec, random_value=None):
    value = float(block.get('PrefixNum', 0)) + float(difficulty_spec.get('ExtraPrefix', 0))
    return roll_fractional_count(value, random_value)


def get_block_min_step(block, difficulty_spec, is_boss=False):
    block_step = block.get('MinBattleStep', '')
    boss_step = difficulty_spec.get('BossMinStep', '') if is_boss else ''
    return max((block_step, boss_step), key=lambda step: STEP_ORD.get(step, 0))


def legal_for_map(item, map_name, map_type):
    if item.get('AreaType') == '世界':
        return True
    return (
        map_type in item.get('AreaType', '')
        and (item.get('AreaName') == '不限' or map_name in item.get('AreaName', ''))
    )


def get_block_event_pool(events, map_name, map_type, battle_type, min_step=''):
    allowed_types = BATTLE_TYPE_FILTER.get(battle_type)
    if allowed_types is None:
        raise ValueError(f'不支持的地块战斗类型: {battle_type}')
    min_step_num = STEP_ORD.get(min_step, 0)
    return [
        event for event in events
        if event.get('Type') != '传送'
        and event.get('Type') in allowed_types
        and STEP_ORD.get(event.get('Step'), 0) >= min_step_num
        and legal_for_map(event, map_name, map_type)
    ]


def can_generate_explore_battle(block):
    event_num = str(block.get('EventNum', '') or '')
    if '-' in event_num:
        _, max_events = (int(part) for part in event_num.split('-', 1))
    else:
        max_events = int(event_num or 0)
    return (
        int(block.get('SpotSize', 0)) == 1
        and max_events > 0
        and int(block.get('RoleWeight', 0)) > 0
    )


def get_explore_battle_probability(block, available_cell_rate=1.0):
    weights = [
        int(block.get('IngredientWeight', 0)),
        int(block.get('RoleWeight', 0)),
        int(block.get('ChestWeight', 0)),
        int(block.get('ItemWeight', 0)),
    ]
    total_weight = sum(max(0, weight) for weight in weights)
    if not can_generate_explore_battle(block) or total_weight <= 0:
        return 0.0
    return max(0.0, min(1.0, float(available_cell_rate))) * weights[1] / total_weight


def get_explore_event_prefix_count(difficulty_spec, event, random_value=None):
    count = min(
        roll_fractional_count(
            float(difficulty_spec.get('ExtraPrefix', 0)), random_value
        ),
        1,
    )
    if event.get('Type') == '稀有' and count == 0:
        count = 1
    return count


def get_explore_prefix_target_indexes(team, prefix_count, event, chooser=None):
    choose = chooser or random.choice
    remaining = max(0, int(prefix_count))
    targets = []

    if event.get('Type') == '稀有':
        for role in team:
            if role and role.get('IDs'):
                role['isBoss'] = True

    for index, role in enumerate(team):
        if remaining <= 0:
            break
        if role and role.get('IDs') and role.get('isBoss'):
            targets.append(index)
            remaining -= 1

    while remaining > 0:
        available = [
            index for index, role in enumerate(team)
            if role and role.get('IDs') and index not in targets and not role.get('prefix')
        ]
        if not available:
            break
        max_step = max(STEP_ORD.get(team[index].get('Step', 'C'), 1) for index in available)
        top_indexes = [
            index for index in available
            if STEP_ORD.get(team[index].get('Step', 'C'), 1) == max_step
        ]
        targets.append(choose(top_indexes))
        remaining -= 1

    return targets


def sort_regular_event_team(team):
    """复刻 GetFightEventPureRoleList 对普通事件队伍的职业站位排序。"""
    fallback = len(CLASS_POSITION)
    return sorted(
        team,
        key=lambda role: CLASS_POSITION.index(role.get('Class', ''))
        if role.get('Class', '') in CLASS_POSITION
        else fallback,
    )


def get_prefix_target_indexes(team, prefix_count, event, is_boss=False, chooser=None):
    """复刻 GenerateBlockBattleEvent 的 Boss 优先及最高品阶优先分配。"""
    choose = chooser or random.choice
    remaining = max(0, int(prefix_count))
    targets = []

    if is_boss:
        must_ids = set(filter(None, event.get('MustRole', '').split(',')))
        boss_candidates = [
            index for index, role in enumerate(team)
            if role and role.get('IDs') and role.get('IDs') in must_ids
        ]
        if boss_candidates:
            boss_index = boss_candidates[0]
            team[boss_index]['isBoss'] = True
            if remaining > 0:
                targets.append(boss_index)
                remaining -= 1

    while remaining > 0:
        available = [
            index for index, role in enumerate(team)
            if role and role.get('IDs') and index not in targets and not role.get('prefix')
        ]
        if not available:
            break
        max_step = max(STEP_ORD.get(team[index].get('Step', 'C'), 1) for index in available)
        top_indexes = [
            index for index in available
            if STEP_ORD.get(team[index].get('Step', 'C'), 1) == max_step
        ]
        targets.append(choose(top_indexes))
        remaining -= 1

    return targets


def get_role_equip_count(role, event, difficulty_spec):
    count = range_random(difficulty_spec.get(f"RoleEquipNum{event.get('Step')}", '0'))
    if event.get('Type') == '稀有':
        count = 10
    if role.get('isBoss'):
        count = max(count, int(difficulty_spec.get('BossEquipMinNum', 0)))
    if role.get('prefix'):
        prefix_step = STEP_ORD.get(role.get('_prefix_step'), 0)
        count += 1 if prefix_step == 1 else max(0, prefix_step - 1)
    return min(count, 10)


def build_area_spot_profiles(area_spots, map_name, map_type, difficulty):
    """显式近似：多格自带战斗加上可翻出战斗的特殊一格地块。"""
    legal_spots = [
        block for block in area_spots
        if legal_for_map(block, map_name, map_type)
        and int(block.get('MinDiffi', 1)) <= difficulty
        and int(block.get('SpotSize', 0)) != 35
        and int(block.get('Weight', 0)) > 0
    ]
    block_battles = [
        {
            'blockId': block['IDs'],
            'source': SOURCE_BLOCK_BATTLE,
            'battleType': 'NormalBattle',
            'isBoss': False,
            'weight': int(block.get('Weight', 0)),
        }
        for block in legal_spots
        if int(block.get('SpotSize', 0)) > 1
        and int(block.get('SpecialSpot', 0)) == 0
    ]
    explore_events = [
        {
            'blockId': block['IDs'],
            'source': SOURCE_EXPLORE_EVENT,
            'weight': int(block.get('Weight', 0)),
            'availableCellRate': 1.0,
        }
        for block in legal_spots
        if can_generate_explore_battle(block)
    ]
    return block_battles + explore_events

def worker(args):
    global MAP_NAME, DIFF
    trials, seed, MAP_NAME, DIFF, block_profiles = args
    random.seed(seed)
    tables = load_data()
    equips, roles = tables['Equip'], tables['Role']
    events, spec = tables['Battle_Event'], tables['Difficulty_Spec']
    prefixes, bonds, world_maps = tables['Prefix'], tables['Bond'], tables['World_Map']
    area_spots = tables['Area_Spot']

    map_dt = next((m for m in world_maps if m.get('Name') == MAP_NAME), {'Type': MAP_NAME, 'Name': MAP_NAME})
    map_type = map_dt.get('Type', MAP_NAME)

    max_bond_map = {
        b['Name']: int(str(b['BondNum']).split(',')[-1])
        for b in bonds
    }
    role_by_id = {r['IDs']: r for r in roles}
    prefix_by_id = {p['IDs']: p for p in prefixes}
    roles_by_step = {
        step: [r for r in roles if r.get('Step') == step]
        for step in STEP_LIST
    }

    pool = [e for e in equips if '探索' in e.get('Source', '')
            and legal_for_map(e, MAP_NAME, map_type)
            and STEP_ORD.get(e.get('Step'), 9) <= 4]

    ss_pool = [e for e in equips if '探索' in e.get('Source', '')
               and legal_for_map(e, MAP_NAME, map_type)
               and e.get('Step') == 'SS']

    d = [x for x in spec if x['Difficulty'] == DIFF][0]
    dc = {'C': d['FixC'], 'B': d['FixB'], 'A': d['FixA'], 'S': d['FixS'], 'SS': d['FixS']}
    base_slot_w = [d['WeaponPossi'], d['ArmorPossi'], d['WeaponPossi'], d['ArmorPossi'],
                   d['TrinketPossi'], d['PartPossi'], d['TrinketPossi'], d['PartPossi'],
                   d['TrinketPossi'], d['PartPossi']]
    legal_events = [event for event in events if legal_for_map(event, MAP_NAME, map_type)]
    for event in legal_events:
        event['_must_roles'] = [
            role_by_id[role_id]
            for role_id in event.get('MustRole', '').split(',')
            if role_id in role_by_id
        ]
        event['_prob_ids'] = [
            role_id for role_id in event.get('ProbRole', '').split(',')
            if role_id in role_by_id
        ]

    block_by_id = {block['IDs']: block for block in area_spots}
    prepared_profiles = []
    for profile in block_profiles:
        block = block_by_id.get(profile.get('blockId'))
        if block is None:
            raise ValueError(f"Area_Spot 中不存在地块 {profile.get('blockId')}")
        if not legal_for_map(block, MAP_NAME, map_type):
            raise ValueError(f"地块 {block['IDs']} 不属于地图 {MAP_NAME}")
        if int(block.get('MinDiffi', 1)) > DIFF:
            raise ValueError(f"地块 {block['IDs']} 在难度 {DIFF} 尚未解锁")
        if int(block.get('SpotSize', 0)) == 35:
            raise ValueError(f"地块样本包含传送门 {block['IDs']}")

        source = profile.get('source')
        if not source:
            source = (
                SOURCE_EXPLORE_EVENT
                if int(block.get('SpotSize', 0)) == 1
                else SOURCE_BLOCK_BATTLE
            )

        if source == SOURCE_BLOCK_BATTLE:
            if int(block.get('SpotSize', 0)) <= 1:
                raise ValueError(f"一格地块 {block['IDs']} 不能作为自带战斗样本")
            is_boss = bool(profile.get('isBoss', False))
            battle_type = profile.get('battleType', 'NormalBattle')
            min_step = get_block_min_step(block, d, is_boss)
            battle_probability = 1.0
        elif source == SOURCE_EXPLORE_EVENT:
            if not can_generate_explore_battle(block):
                raise ValueError(f"一格地块 {block['IDs']} 不能翻出战斗")
            is_boss = False
            battle_type = 'Battle'
            min_step = ''
            battle_probability = float(profile.get(
                'battleProbability',
                get_explore_battle_probability(
                    block, profile.get('availableCellRate', 1.0)
                ),
            ))
            if not 0.0 <= battle_probability <= 1.0:
                raise ValueError(f"地块 {block['IDs']} 的战斗概率必须在 0 到 1 之间")
        else:
            raise ValueError(f"不支持的战斗来源: {source}")

        event_pool = get_block_event_pool(
            legal_events, MAP_NAME, map_type, battle_type, min_step
        )
        if not event_pool:
            raise ValueError(
                f"{MAP_NAME} 地块 {block['IDs']} 的 {battle_type}/{min_step} 事件池为空"
            )
        event_weights = [
            int(max(0.0, 1.0 + dc.get(event['Step'], 0)) * event.get('Weight', 100))
            for event in event_pool
        ]
        if sum(event_weights) <= 0:
            raise ValueError(
                f"{MAP_NAME} 地块 {block['IDs']} 的事件池权重全部为 0"
            )
        prepared_profiles.append({
            'block': block,
            'source': source,
            'isBoss': is_boss,
            'battleProbability': battle_probability,
            'weight': max(0, int(profile.get('weight', 1))),
            'events': event_pool,
            'eventWeights': event_weights,
        })

    profile_weights = [profile['weight'] for profile in prepared_profiles]
    if not prepared_profiles or sum(profile_weights) <= 0:
        raise ValueError(f'{MAP_NAME} 没有可用的非传送门地块战斗样本')

    for e in pool:
        bNames = []
        if e.get('Pure'): bNames.append(e['Pure'].split('[')[0].strip())
        if e.get('Title'): bNames.append(e['Title'].split('[')[0].strip())
        if e.get('Enhance'): bNames.append(e['Enhance'].split('[')[0].strip())
        e['bondNames'] = bNames
        e['pure_kv'] = parse_bond_kv(e.get('Pure', ''))
        e['title_kv'] = parse_bond_kv(e.get('Title', ''))
        e['gen_weights'] = [
            [
                int(max(0.0,
                        1.0
                        + dc.get(e.get('Step'), 0)
                        + EVENT_CORR[event_num][STEP_ORD[e['Step']] - 1]
                        + (PREFIX_CORR[prefix_num][STEP_ORD[e['Step']] - 1] if prefix_num >= 0 else 0.0))
                    * e.get('Weight', 100))
                for prefix_num in (-1, 0, 1, 2, 3)
            ]
            for event_num in range(4)
        ]

    cand_map = {}
    for st in SLOT_LIST:
        for rc in CLASSES:
            cand_map[(st, rc)] = [e for e in pool if e['Type'] == st and (e['Class'] == '全职' or rc in e['Class'])]

    prefix_pool = {}
    for role in roles:
        for step_str in STEP_LIST:
            prefix_pool[(role['IDs'], step_str)] = [
                p for p in prefixes
                if p.get('Step') == step_str
                and (p.get('AreaLimit') == '全部' or role.get('Map', '') in p.get('AreaLimit', ''))
                and (p.get('Element') == '全部' or role.get('Element', '') in p.get('Element', ''))
                and (p.get('ClassLimit') == '全职' or role.get('Class', '') in p.get('ClassLimit', ''))
            ]

    # ExploreSceneManager.cs:531 GetFightEventPureRoleList & BattleEventDataTable.cs:37 GetRoleNum
    def get_fight_event_pure_role_list(eventInfo):
        if eventInfo.get('Name') == "冒险小队":
            step_roles = roles_by_step[eventInfo.get('Step')]
            warriors = [r for r in step_roles if r.get('Class') == '战士']
            non_warriors = [r for r in step_roles if r.get('Class') != '战士']
            mages_shooters = [r for r in step_roles if r.get('Class') in ('法师', '射手')]

            r1 = warriors[wpick([r.get('Weight', 100) for r in warriors])] if warriors else step_roles[0]
            r2 = non_warriors[wpick([r.get('Weight', 100) for r in non_warriors])] if non_warriors else step_roles[0]
            r3 = mages_shooters[wpick([r.get('Weight', 100) for r in mages_shooters])] if mages_shooters else step_roles[0]
            return [dict(r1), dict(r2), dict(r3)]

        is_rare = eventInfo.get('Type') == '稀有'
        target_role_num = 1 if is_rare else range_random(d.get(f"EnemyNum{eventInfo.get('Step')}", '3-3'))

        team = []
        for must_role in eventInfo['_must_roles']:
            team.append(dict(must_role))

        prob_ids = eventInfo['_prob_ids']
        # 官方源码初始化为 { eventInfo.MustRole }，不是拆分后的 MustRole ID 列表。
        appeared_role = [eventInfo.get('MustRole', '')]

        while len(team) < target_role_num:
            possible_roles = [s for s in prob_ids if s not in appeared_role]
            if not possible_roles:
                possible_roles = list(prob_ids)

            matching = [role_by_id[role_id] for role_id in possible_roles]
            if not matching: break
            idx = wpick([r.get('Weight', 100) for r in matching])
            role_item = matching[idx]
            team.append(dict(role_item))
            appeared_role.append(role_item['IDs'])

        return sort_regular_event_team(team)

    # RoleHelper.cs:251 DecideRolePrefix
    def decide_role_prefix(role, ev_step):
        pSteps = [10000, 1000, 100, 10]
        evNum = STEP_ORD.get(ev_step, 1) - 1
        role_step_int = STEP_ORD.get(role.get('Step', 'C'), 1)
        for i in range(4):
            corr = 1.0 + dc.get(STEP_LIST[i], 0) + EVENT_CORR[evNum][i]
            if role_step_int > i + 1:
                corr = 0.0
            pSteps[i] = int(max(0.0, corr) * pSteps[i])
        pSteps.append(0)
        pNum = wpick(pSteps)
        if 0 <= pNum < 4:
            stepStr = STEP_LIST[pNum]
            legal = prefix_pool[(role['IDs'], stepStr)]
            if legal:
                return legal[wpick([p.get('Weight', 100) for p in legal])]['IDs']
        return None

    cnt = Counter()
    ss_expected = Counter()

    for _ in range(trials):
        profile = prepared_profiles[wpick(profile_weights)]
        if random.random() >= profile['battleProbability']:
            continue
        ev = profile['events'][wpick(profile['eventWeights'])]
        team = get_fight_event_pure_role_list(ev)

        if profile['source'] == SOURCE_BLOCK_BATTLE:
            prefix_count = get_block_prefix_count(profile['block'], d)
            prefix_targets = get_prefix_target_indexes(
                team, prefix_count, ev, profile['isBoss']
            )
        else:
            prefix_count = get_explore_event_prefix_count(d, ev)
            prefix_targets = get_explore_prefix_target_indexes(
                team, prefix_count, ev
            )
        for target_index in prefix_targets:
            target_role = team[target_index]
            prefix_id = decide_role_prefix(target_role, ev['Step'])
            target_role['prefix'] = prefix_id
            prefix = prefix_by_id.get(prefix_id) if prefix_id else None
            target_role['_prefix_step'] = prefix.get('Step') if prefix else ''

        # ExploreSceneManager.cs:628-784 GenerateEquipForEventRole
        for role in team:
            rClass = role.get('Class', '')
            if not rClass: continue
            role['_equips'] = [None] * 10

            prefix_id = role.get('prefix')
            pref_obj = prefix_by_id.get(prefix_id) if prefix_id else None
            pref_num = (STEP_ORD.get(pref_obj.get('Step'), 1) - 1) if pref_obj else -1

            appear_bond = {}
            if len(set(base_slot_w)) == 1:
                slot_order = random.sample(range(10), 10)
            else:
                cur_slot_w = list(base_slot_w)
                slot_order = []
                for _ in range(10):
                    slot_index = wpick(cur_slot_w)
                    slot_order.append(slot_index)
                    cur_slot_w[slot_index] = 0

            equip_count = get_role_equip_count(role, ev, d)
            for sIdx in slot_order[:equip_count]:
                slotType = SLOT_LIST[sIdx]

                list2 = cand_map.get((slotType, rClass), [])
                if not list2: continue

                forced_bond = [k for k, v in appear_bond.items() if v < max_bond_map.get(k, 99)]

                list3 = [e for e in list2 if not appear_bond or any(b in forced_bond for b in e['bondNames'])]
                flag = True
                if not list3:
                    list3 = list2
                    flag = False

                evNum = STEP_ORD.get(ev['Step'], 1) - 1

                while True:
                    list4 = []
                    for item in list3:
                        list4.append(item['gen_weights'][evNum][pref_num + 1])

                    if flag:
                        num6 = int((1.0 + dc.get(ev['Step'], 0)) * STEP_W.get(ev['Step'], 100))
                        list4.append(max(0, num6))
                        flag = False

                    num4 = wpick(list4)
                    # C# 的 list3 == list2 是引用相等；Python 必须用 is 才能复刻。
                    if num4 < len(list3) or list3 is list2:
                        break
                    list3 = list2

                if num4 < 0 and list3:
                    num4 = 0
                if 0 <= num4 < len(list3):
                    chosen = list3[num4]
                    pk, pv = chosen['pure_kv']
                    if pk: appear_bond[pk] = appear_bond.get(pk, 0) + pv
                    tk, tv = chosen['title_kv']
                    if tk: appear_bond[tk] = appear_bond.get(tk, 0) + tv
                    role['_equips'][sIdx] = chosen

        # SS Red Equip (GenerateRedEquip)
        evStepNum = STEP_ORD.get(ev['Step'], 1)
        if evStepNum >= 3 and ss_pool:
            denom = 10000 if evStepNum == 3 else 1000
            red_base_probability = 1.0 / denom / len(ss_pool)
            team_classes = {role.get('Class', '') for role in team}
            for red_equip in ss_pool:
                red_class = red_equip.get('Class', '全职')
                if red_class == '全职' or any(role_class in red_class for role_class in team_classes):
                    ss_expected[red_equip['IDs']] += red_base_probability

            # 仍实际模拟一次替换，以准确反映红装覆盖同槽位 S 装的影响。
            if random.randint(0, denom - 1) == 0:
                chosenRed = random.choice(ss_pool)
                red_class = chosenRed.get('Class', '全职')
                matching_roles = [r for r in team if red_class == '全职' or r.get('Class', '') in red_class]
                if matching_roles:
                    chosen_role = random.choice(matching_roles)
                    chosen_role['_equips'][SLOT_LIST.index(chosenRed['Type'])] = chosenRed

        battle_encountered = {
            equip['IDs']
            for role in team
            for equip in role.get('_equips', [])
            if equip is not None
        }
        for eid in battle_encountered:
            cnt[eid] += 1

    return cnt, ss_expected

def difficulty(p):
    if p >= 0.20:
        return 'very_easy', '较易'
    if p >= 0.10:
        return 'normal', '一般'
    if p >= 0.04:
        return 'rather_hard', '较难'
    return 'very_hard', '极难'


def load_block_samples(path):
    with open(path, encoding='utf-8') as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError('地块样本必须是以地图名为键的 JSON 对象')
    return data


def run_map(map_name, total_trials, worker_count, block_profiles):
    difficulty_level = MAP_LEVELS[map_name]
    base_trials, remainder = divmod(total_trials, worker_count)
    jobs = [
        (
            base_trials + (1 if i < remainder else 0),
            9000 + i,
            map_name,
            difficulty_level,
            block_profiles,
        )
        for i in range(worker_count)
    ]

    print(
        f"[{map_name}] 难度 {difficulty_level}，{total_trials:,} 次地块战斗，"
        f"{len(block_profiles)} 个地块样本，{worker_count} 进程"
    )
    t0 = time.time()
    with mp.Pool(worker_count) as pool:
        results = pool.map(worker, jobs)

    total = Counter()
    total_ss_expected = Counter()
    for c, ss_expected in results:
        total.update(c)
        total_ss_expected.update(ss_expected)

    elapsed = time.time() - t0
    tables = load_data()
    equips = tables['Equip']
    local = [
        e for e in equips
        if e.get('AreaName') == map_name and e.get('Step') in ('S', 'SS')
    ]
    rows = []
    for e in local:
        cnt = total_ss_expected.get(e['IDs'], 0.0) if e['Step'] == 'SS' else total.get(e['IDs'], 0)
        probability = cnt / total_trials * 100.0
        diff_key, diff_name = difficulty(probability)
        rows.append({
            'id': e['IDs'],
            'name': e['Name'],
            'step': e['Step'],
            'class': e.get('Class', '全职'),
            'type': e['Type'],
            'weight': e.get('Weight', 0),
            'drops': cnt,
            'encounters': cnt,
            'trials': total_trials,
            'metric': 'map_farm_source_enemy_equipped',
            'estimator': 'conditional_expectation' if e['Step'] == 'SS' else 'monte_carlo',
            'difficulty': diff_key,
            'difficultyName': diff_name,
            'diffName': diff_name,
            'probPercent': probability,
            'probStr': f'{probability:.4f}%',
            'approxBattles': round(100.0 / probability) if probability > 0 else total_trials,
        })

    print(f"[{map_name}] 完成，耗时 {elapsed:.1f}s，输出 {len(rows)} 件装备")
    return rows


def main():
    parser = argparse.ArgumentParser(description='重新生成金装可刷战斗来源遇见率数据')
    parser.add_argument('--map', default='all', choices=['all', *MAP_LEVELS.keys()])
    parser.add_argument('--trials', type=int, default=10_000_000)
    parser.add_argument('--workers', type=int, default=min(8, mp.cpu_count() or 4))
    parser.add_argument(
        '--profile-mode',
        choices=('server-samples', 'area-spot-weighted'),
        default='server-samples',
        help='默认要求服务器地图样本；area-spot-weighted 仅为显式近似',
    )
    parser.add_argument(
        '--block-samples',
        help=(
            '服务器地块样本 JSON，结构为 {"地图名": '
            '[{blockId,source,battleType,isBoss,weight,availableCellRate}]}'
        ),
    )
    parser.add_argument(
        '--output',
        default=os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'src', 'assets', 'simulation_exact_results.json'
        )
    )
    args = parser.parse_args()

    maps = list(MAP_LEVELS) if args.map == 'all' else [args.map]
    worker_count = max(1, min(args.workers, args.trials))
    tables = load_data()
    world_map_by_name = {item['Name']: item for item in tables['World_Map']}
    samples = None
    if args.profile_mode == 'server-samples':
        if not args.block_samples:
            parser.error('精确统计需要 --block-samples；近似统计请显式使用 --profile-mode area-spot-weighted')
        samples = load_block_samples(args.block_samples)

    output = {
        '_meta': {
            'sourceModel': 'map_farm_sources_v3',
            'sourceVersion': '1.2.0',
            'metric': 'map_farm_source_opportunity',
            'profileMode': args.profile_mode,
            'precision': 'server-sampled' if samples is not None else 'table-weighted-estimate',
            'sources': ['多格地块自带战斗', '指定一格地块探索翻出的战斗'],
            'excludes': ['异界传送门', '星界秘境', '战斗结算骰点'],
            'isWholeMapProbability': False,
        }
    }
    for map_name in maps:
        if samples is not None:
            block_profiles = samples.get(map_name, [])
        else:
            map_type = world_map_by_name[map_name]['Type']
            block_profiles = build_area_spot_profiles(
                tables['Area_Spot'], map_name, map_type, MAP_LEVELS[map_name]
            )
        if not block_profiles:
            parser.error(f'{map_name} 没有可用的地块战斗样本')
        output[map_name] = run_map(
            map_name, args.trials, worker_count, block_profiles
        )

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'概率数据已写入: {args.output}')


if __name__ == '__main__':
    mp.freeze_support()
    main()
