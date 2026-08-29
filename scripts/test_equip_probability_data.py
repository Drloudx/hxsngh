import json
from pathlib import Path

from generate_equip_probability_data import (
    MAP_LEVELS,
    SOURCE_BLOCK_BATTLE,
    SOURCE_EXPLORE_EVENT,
    build_area_spot_profiles,
    can_generate_explore_battle,
    get_block_event_pool,
    get_block_min_step,
    get_block_prefix_count,
    get_explore_battle_probability,
    get_explore_event_prefix_count,
    get_explore_prefix_target_indexes,
    get_prefix_target_indexes,
    get_role_equip_count,
    difficulty,
    sort_regular_event_team,
)


PROJECT_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = PROJECT_DIR / 'src' / 'assets'


def load_table(name):
    with (ASSETS_DIR / name).open(encoding='utf-8') as file:
        return json.load(file)


def test_block_prefix_uses_area_spot_and_is_not_capped_at_one():
    block = {'PrefixNum': 2}
    difficulty = {'ExtraPrefix': 0.5}
    assert get_block_prefix_count(block, difficulty, random_value=0.49) == 3
    assert get_block_prefix_count(block, difficulty, random_value=0.50) == 2


def test_block_min_step_combines_spot_and_boss_minimum():
    difficulty = {'BossMinStep': 'A'}
    assert get_block_min_step({'MinBattleStep': 'B'}, difficulty, False) == 'B'
    assert get_block_min_step({'MinBattleStep': 'B'}, difficulty, True) == 'A'
    assert get_block_min_step({'MinBattleStep': 'S'}, difficulty, True) == 'S'


def test_prefixes_can_cover_multiple_roles_and_boss_is_first():
    team = [
        {'IDs': 'boss', 'Step': 'C'},
        {'IDs': 's-role', 'Step': 'S'},
        {'IDs': 'a-role', 'Step': 'A'},
    ]
    event = {'MustRole': 'boss'}
    targets = get_prefix_target_indexes(
        team, 3, event, is_boss=True, chooser=lambda choices: choices[0]
    )
    assert targets == [0, 1, 2]
    assert team[0]['isBoss'] is True


def test_portal_events_are_not_regular_exploration_battles():
    events = load_table('Battle_Event.json')
    world_maps = {item['Name']: item for item in load_table('World_Map.json')}
    for map_name in MAP_LEVELS:
        map_type = world_maps[map_name]['Type']
        battle_pool = get_block_event_pool(
            events, map_name, map_type, 'Battle', min_step='C'
        )
        assert battle_pool
        assert all(event.get('Type') != '传送' for event in battle_pool)


def test_normal_and_rare_block_pools_are_separate_and_honor_min_step():
    events = load_table('Battle_Event.json')
    map_name = '荒凉戈壁'
    map_type = '沙漠'
    normal = get_block_event_pool(events, map_name, map_type, 'NormalBattle', 'A')
    rare = get_block_event_pool(events, map_name, map_type, 'RareBattle', 'A')
    assert normal and rare
    assert all(event['Type'] == '常规' and event['Step'] in ('A', 'S') for event in normal)
    assert all(event['Type'] == '稀有' and event['Step'] in ('A', 'S') for event in rare)


def test_only_fourteen_specific_one_cell_spots_can_generate_battles():
    spots = load_table('Area_Spot.json')
    actual = {
        (spot['AreaName'], spot['Name'])
        for spot in spots
        if can_generate_explore_battle(spot)
    }
    expected = {
        ('新生平原', '篝火'),
        ('广袤草原', '兽骨图腾'),
        ('迷失森林', '小水塘'),
        ('铁血高地', '木桩'),
        ('清凉沙滩', '海螺'),
        ('废弃矿洞', '矿箱'),
        ('幽暗密林', '捕兽夹'),
        ('荒凉戈壁', '路牌'),
        ('洞穴深处', '地雷菇'),
        ('遗忘之海', '海葵'),
        ('无尽荒漠', '仙人掌'),
        ('枯木丛林', '荆棘'),
        ('极寒冰原', '冰牙图腾'),
        ('熔岩通道', '矿箱'),
    }
    assert actual == expected
    assert all(spot['SpotSize'] == 1 for spot in spots if can_generate_explore_battle(spot))


def test_one_cell_battle_probability_uses_event_weights():
    spot = next(
        item for item in load_table('Area_Spot.json')
        if item['AreaName'] == '洞穴深处' and item['Name'] == '地雷菇'
    )
    assert get_explore_battle_probability(spot) == 3700 / 9700
    assert get_explore_battle_probability(spot, available_cell_rate=0.5) == 0.5 * 3700 / 9700

    normal_ground = next(
        item for item in load_table('Area_Spot.json')
        if item['AreaName'] == '洞穴深处' and item['Name'] == '岩地'
    )
    assert not can_generate_explore_battle(normal_ground)
    assert get_explore_battle_probability(normal_ground) == 0.0


def test_explore_event_keeps_old_prefix_cap_and_rare_guarantee():
    difficulty = {'ExtraPrefix': 3}
    assert get_explore_event_prefix_count(difficulty, {'Type': '常规'}) == 1
    assert get_explore_event_prefix_count(
        {'ExtraPrefix': 0}, {'Type': '稀有'}, random_value=1.0
    ) == 1

    team = [{'IDs': 'rare-role', 'Step': 'A'}, {'IDs': 'other', 'Step': 'S'}]
    targets = get_explore_prefix_target_indexes(
        team, 1, {'Type': '稀有'}, chooser=lambda choices: choices[0]
    )
    assert targets == [0]
    assert all(role['isBoss'] is True for role in team)


def test_regular_event_team_uses_game_class_position_order():
    team = [
        {'IDs': 'mage', 'Class': '法师'},
        {'IDs': 'shooter', 'Class': '射手'},
        {'IDs': 'warrior', 'Class': '战士'},
        {'IDs': 'priest', 'Class': '牧师'},
    ]
    assert [role['IDs'] for role in sort_regular_event_team(team)] == [
        'warrior', 'priest', 'shooter', 'mage'
    ]


def test_probability_uses_four_fixed_difficulty_bands():
    assert difficulty(0.20) == ('very_easy', '较易')
    assert difficulty(0.10) == ('normal', '一般')
    assert difficulty(0.04) == ('rather_hard', '较难')
    assert difficulty(0.0399) == ('very_hard', '极难')


def test_area_spot_estimate_combines_multicell_and_eligible_one_cell_sources():
    profiles = build_area_spot_profiles(
        load_table('Area_Spot.json'), '荒凉戈壁', '沙漠', 170
    )
    spot_by_id = {spot['IDs']: spot for spot in load_table('Area_Spot.json')}
    assert profiles
    for profile in profiles:
        spot = spot_by_id[profile['blockId']]
        assert spot['SpotSize'] != 35
        if profile['source'] == SOURCE_BLOCK_BATTLE:
            assert spot['SpotSize'] > 1
            assert spot['SpecialSpot'] == 0
            assert profile['battleType'] == 'NormalBattle'
        else:
            assert profile['source'] == SOURCE_EXPLORE_EVENT
            assert can_generate_explore_battle(spot)


def test_every_map_has_a_usable_estimated_block_event_pool():
    area_spots = load_table('Area_Spot.json')
    events = load_table('Battle_Event.json')
    world_maps = {item['Name']: item for item in load_table('World_Map.json')}
    difficulty_specs = {
        item['Difficulty']: item for item in load_table('Difficulty_Spec.json')
    }
    spot_by_id = {spot['IDs']: spot for spot in area_spots}

    for map_name, difficulty in MAP_LEVELS.items():
        map_type = world_maps[map_name]['Type']
        profiles = build_area_spot_profiles(area_spots, map_name, map_type, difficulty)
        assert profiles
        assert sum(
            profile['source'] == SOURCE_EXPLORE_EVENT for profile in profiles
        ) == 1
        assert any(profile['source'] == SOURCE_BLOCK_BATTLE for profile in profiles)
        for profile in profiles:
            spot = spot_by_id[profile['blockId']]
            if profile['source'] == SOURCE_BLOCK_BATTLE:
                battle_type = profile['battleType']
                min_step = get_block_min_step(spot, difficulty_specs[difficulty])
            else:
                battle_type = 'Battle'
                min_step = ''
            assert get_block_event_pool(
                events, map_name, map_type, battle_type, min_step
            )


def test_highest_map_difficulty_generates_ten_equips_per_enemy():
    difficulty = next(
        item for item in load_table('Difficulty_Spec.json')
        if item['Difficulty'] == 220
    )
    for step in ('C', 'B', 'A', 'S'):
        assert get_role_equip_count({}, {'Step': step, 'Type': '常规'}, difficulty) == 10


def test_milk_can_carry_dancer_bracelet_in_desert():
    roles = {item['IDs']: item for item in load_table('Role.json')}
    equips = {item['IDs']: item for item in load_table('Equip.json')}
    events = load_table('Battle_Event.json')
    world_maps = {item['Name']: item for item in load_table('World_Map.json')}

    milk = roles['M12207']
    bracelet = equips['Z05001_292']
    map_name = '荒凉戈壁'
    map_type = world_maps[map_name]['Type']
    legal_events = get_block_event_pool(events, map_name, map_type, 'Battle', 'C')
    event_role_ids = {
        role_id
        for event in legal_events
        for role_id in (event.get('MustRole', '') + ',' + event.get('ProbRole', '')).split(',')
        if role_id
    }

    assert milk['IDs'] in event_role_ids
    assert milk['Class'] == bracelet['Class'] == '射手'
    assert bracelet['Type'] == '护手'
    assert bracelet['AreaName'] == map_name


if __name__ == '__main__':
    tests = [value for name, value in globals().items() if name.startswith('test_')]
    for test in tests:
        test()
    print(f'{len(tests)} checks passed')
