<template>
  <div class="battle-sim-container">
    <!-- Header -->
    <div class="battle-sim-header" v-show="!detailModal.isOpen">
      <h2 class="title">战斗模拟</h2>
    </div>

    <div class="arena-stage" v-show="!detailModal.isOpen">
      <div class="arena-grid">
        <!-- Left Team (Us) -->
        <div class="team-side left-side">
          <div class="team-side-title">我方队伍</div>
          <div class="slots-container">
            <div
              v-for="(slot, idx) in leftTeam"
              :key="'left-' + idx"
              class="arena-slot"
              @click="handleSlotClick('left', idx)"
            >
              <div v-if="slot" class="character-card-wrapper" :class="{ 'float-animation': slot }">
                <button class="remove-btn" @click.stop="removeCharacter('left', idx)">✕</button>
                <div class="avatar-box">
                  <img :src="`/Role/${slot.id}.png`" :alt="slot.displayName" class="avatar-img game-sprite" @error="handleRoleIconError" />
                </div>
                <div class="slot-info">
                  <div class="slot-name" :style="{ color: getStepConfig(slot.step).color }">
                    {{ slot.displayName }}
                  </div>
                  <div class="slot-lv">Lv.{{ slot.level }}</div>
                </div>
              </div>
              <div v-else class="empty-slot">
                <span class="plus-icon">+</span>
                <span class="empty-text">点击上阵</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Center VS divider -->
        <div class="vs-divider"></div>

        <!-- Right Team (Enemies) -->
        <div class="team-side right-side">
          <div class="team-side-title">敌方队伍</div>
          <div class="slots-container">
            <div
              v-for="(slot, idx) in rightTeam"
              :key="'right-' + idx"
              class="arena-slot"
              @click="handleSlotClick('right', idx)"
            >
              <div v-if="slot" class="character-card-wrapper" :class="{ 'float-animation': slot }">
                <button class="remove-btn" @click.stop="removeCharacter('right', idx)">✕</button>
                <div class="avatar-box">
                  <img :src="`/Role/${slot.id}.png`" :alt="slot.displayName" class="avatar-img game-sprite mirrored" @error="handleRoleIconError" />
                </div>
                <div class="slot-info">
                  <div class="slot-name" :style="{ color: getStepConfig(slot.step).color }">
                    {{ slot.displayName }}
                  </div>
                  <div class="slot-lv">Lv.{{ slot.level }}</div>
                </div>
              </div>
              <div v-else class="empty-slot">
                <span class="plus-icon">+</span>
                <span class="empty-text">点击上阵</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Config Buttons -->
      <div class="arena-actions">
        <button class="config-side-btn left" @click="openSideConfig('left')">配置我方</button>
        <button class="start-battle-btn" @click="simulateBattle">开始模拟</button>
        <button class="config-side-btn right" @click="openSideConfig('right')">配置敌方</button>
      </div>

      <!-- 战斗日志区域 -->
      <div class="battle-log-container">
        <div class="log-header">战斗日志</div>
        <div class="log-content" ref="logContainerRef">
          <div v-for="(log, idx) in battleLogs" :key="idx" class="log-item">
            <span class="log-time">[{{ log.time }}]</span>
            <span class="log-text" :class="log.type">{{ log.text }}</span>
          </div>
          <div v-if="battleLogs.length === 0" class="log-empty">
            点击“开始模拟”生成回合战斗日志...
          </div>
        </div>
      </div>
    </div>

      <div v-if="detailModal.isOpen" class="full-page-detail-container">
        <div class="modal-card detail-modal-card full-page-mode">
          <div class="modal-header">
            <h3>角色详情配置</h3>
            <button class="close-btn" @click="closeDetailModal" style="font-size: 13px; font-weight: bold; background: var(--bg-hover); padding: 4px 12px; border-radius: 6px;">返回上一层</button>
          </div>

          <div v-if="detailModal.char" class="detail-modal-body">
            <div class="detail-top-bar">
              <!-- 左侧角色名 -->
              <h2 class="detail-char-name" :style="{ color: getStepConfig(detailModal.char.step).color }">
                {{ detailModal.char.displayName }}
              </h2>

              <!-- 星星：绝对定位严格居中 -->
              <div class="star-display-list">
                <img
                  v-for="n in 5"
                  :key="n"
                  :src="'mid_ico_map_0001.png'"
                  class="star-image game-sprite"
                  :class="{ 'star-grey': n > (detailModal.char.star || 1) }"
                />
              </div>

              <!-- 切换按钮：紧贴星星右侧 -->
              <button class="config-side-btn left star-action-btn" @click="toggleStarLevel">切换</button>

              <!-- 右侧等级选择器 -->
              <div class="level-selector-inline">
                <span class="level-selector-label">等级</span>
                <div class="level-input-wrapper-horizontal">
                  <span class="level-adjust-btn-horizontal down" @click="adjustLevel(-1)">▼</span>
                  <input
                    type="number"
                    v-model.number="detailModal.char.level"
                    min="1"
                    max="100"
                    class="level-number-input-horizontal"
                  />
                  <span class="level-adjust-btn-horizontal up" @click="adjustLevel(1)">▲</span>
                </div>
              </div>
            </div>

            <div class="detail-core-layout">
              <div class="equip-slots-column left-slots">
                <div
                  v-for="slotName in leftEquipSlots"
                  :key="slotName"
                  class="equip-slot-item"
                  :class="{ 'is-inherited': detailModal.char.equips[slotName]?.inherit }"
                  :style="detailModal.char.equips[slotName] && !detailModal.char.equips[slotName].inherit ? { backgroundColor: getStepConfig(detailModal.char.equips[slotName].Step).lightBg } : {}"
                  @click="openEquipPicker(slotName)"
                >
                  <div class="slot-content" style="flex-direction: column; align-items: center; width: 100%;">
                    <template v-if="detailModal.char.equips[slotName]">
                      <div class="slot-row-first" style="display: flex; align-items: center; gap: 6px; width: 100%; position: relative; justify-content: center;">
                        <div class="equip-icon-wrapper" style="position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                          <img :src="`/Equip/${detailModal.char.equips[slotName].IDs}.png`" class="equip-icon game-sprite" @error="handleEquipIconError" />
                          <div v-if="detailModal.char.equips[slotName].star > 0" class="equip-stars-overlay">
                            <img v-for="n in detailModal.char.equips[slotName].star" :key="n" :src="'mid_ico_map_0001.png'" class="equip-star-icon game-sprite" />
                          </div>
                        </div>
                        <span class="equip-name" :style="{ color: getEquipColor(detailModal.char.equips[slotName].Step), textAlign: 'left', flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }">
                          {{ detailModal.char.equips[slotName].Name }}
                        </span>
                        <button class="equip-clear-btn" @click.stop="removeEquip(slotName)">✕</button>
                      </div>
                    </template>
                    <template v-else>
                      <span class="slot-placeholder">{{ slotName }}</span>
                    </template>
                  </div>
                </div>
              </div>

              <!-- 中间立绘栏 -->
              <div class="center-portrait-column">
                <div class="center-portrait-card" :style="{ backgroundColor: getStepConfig(detailModal.char.step).bg }">
                  <div v-if="activePreviewSkill" class="skill-preview-floating-bottom">
                    <div class="preview-title-bar-light">
                      <span class="preview-name-light">{{ activePreviewSkill.name }}</span>
                      <button class="preview-close-x-light" @click.stop="activePreviewSkill = null">✕</button>
                    </div>
                    <div class="preview-desc-body-light">{{ activePreviewSkill.desc }}</div>
                  </div>

                  <img
                    :src="`/RoleDraw/${detailModal.char.id}_1__single_part1_1@1.png`"
                    :alt="detailModal.char.displayName"
                    class="big-portrait-img game-sprite"
                    @error="handleDrawError"
                  />
                </div>

                <!-- 底部 6 个技能格子 -->
                <div class="center-bottom-grid">
                  <div
                    v-for="(feat, fIdx) in mappedFeatures"
                    :key="fIdx"
                    class="bottom-feature-box"
                    :class="{ 'feature-locked': !feat.isUnlocked, 'feature-active': activePreviewSkill && activePreviewSkill.fIdx === fIdx }"
                    @click="handleFeatureClick(feat, fIdx)"
                  >
                    <img :src="feat.icon" class="feature-full-icon game-sprite" @error="handleSkillIconFallback" />
                    <div class="feature-label-text-absolute">{{ feat.label }}</div>
                    <div v-if="!feat.isUnlocked" class="lock-mask-text">{{ feat.unlockStar }}星解锁</div>
                  </div>
                </div>
              </div>

              <div class="equip-slots-column right-slots">
                <div
                  v-for="slotName in rightEquipSlots"
                  :key="slotName"
                  class="equip-slot-item"
                  :class="{ 'is-inherited': detailModal.char.equips[slotName]?.inherit }"
                  :style="detailModal.char.equips[slotName] && !detailModal.char.equips[slotName].inherit ? { backgroundColor: getStepConfig(detailModal.char.equips[slotName].Step).lightBg } : {}"
                  @click="openEquipPicker(slotName)"
                >
                  <div class="slot-content" style="flex-direction: column; align-items: center; width: 100%;">
                    <template v-if="detailModal.char.equips[slotName]">
                      <div class="slot-row-first" style="display: flex; align-items: center; gap: 6px; width: 100%; position: relative; justify-content: center;">
                        <div class="equip-icon-wrapper" style="position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                          <img :src="`/Equip/${detailModal.char.equips[slotName].IDs}.png`" class="equip-icon game-sprite" @error="handleEquipIconError" />
                          <div v-if="detailModal.char.equips[slotName].star > 0" class="equip-stars-overlay">
                            <img v-for="n in detailModal.char.equips[slotName].star" :key="n" :src="'mid_ico_map_0001.png'" class="equip-star-icon game-sprite" />
                          </div>
                        </div>
                        <span class="equip-name" :style="{ color: getEquipColor(detailModal.char.equips[slotName].Step), textAlign: 'left', flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }">
                          {{ detailModal.char.equips[slotName].Name }}
                        </span>
                        <button class="equip-clear-btn" @click.stop="removeEquip(slotName)">✕</button>
                      </div>
                    </template>
                    <template v-else>
                      <span class="slot-placeholder">{{ slotName }}</span>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div class="dynamic-attributes-box">
              <h4 class="box-title">当前面板数值统计</h4>
              <div class="attributes-grid">
                <div v-for="attr in calculatedStats" :key="attr.key" class="attribute-item-card">
                  <img :src="`/General/${attr.icon}`" class="attr-icon game-sprite" />
                  <div class="attr-meta">
                    <span class="attr-name">{{ attr.name }}</span>
                    <span class="attr-val">{{ attr.value }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 词条总览 -->
            <div v-if="characterBondSummary && characterBondSummary.length > 0" class="bond-summary-box">
              <h4 class="box-title">词条总览</h4>
              <div class="bond-summary-list">
                <div v-for="bond in characterBondSummary" :key="bond.name" class="bond-summary-item">
                  <!-- 点击头部展开/收起 -->
                  <div class="bs-header" @click="expandedSummaryBonds[bond.name] = !expandedSummaryBonds[bond.name]" style="cursor: pointer; user-select: none;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="bs-name" :style="{ color: bond.color }">
                        {{ bond.name }} [{{ bond.totalLevel }}]
                      </span>
                      <span class="bs-type-tag">{{ bond.type }}</span>
                    </div>
                    <!-- 黑色箭头 -->
                    <img src="/ui/up.svg" class="triangle-icon" :class="{ collapsed: !expandedSummaryBonds[bond.name] }" />
                  </div>
                  <!-- 展开展示阈值 -->
                  <div v-show="expandedSummaryBonds[bond.name]" class="bs-thresholds">
                    <div
                      v-for="(row, i) in bond.rows"
                      :key="i"
                      :class="['bs-thresh-row', i <= bond.unlockedIdx ? 'unlocked' : 'locked']"
                    >
                      <span class="bs-thresh-num">[{{ row.num }}]</span>
                      <span class="bs-thresh-effect">{{ row.effect }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    <!-- 角色选择弹窗 -->
    <Transition name="fade">
      <div v-if="pickerModal.isOpen" class="modal-overlay" @click="closePickerModal">
        <div class="modal-card picker-modal-card" @click.stop>
          <div class="modal-header">
            <h3>选择角色上阵</h3>
            <button class="close-btn" @click="closePickerModal">✕</button>
          </div>

          <div class="picker-search-row">
            <div class="search-box-wrapper">
              <img src="/ui/search.svg" class="search-icon" />
              <input
                type="text"
                v-model="pickerModal.searchQuery"
                placeholder="输入角色名字搜索..."
                class="search-input"
              />
            </div>
          </div>

          <div class="picker-list-wrapper">
            <div class="picker-grid">
              <div
                v-for="char in filteredCharacters"
                :key="char.id"
                class="picker-char-card"
                @click="selectCharacter(char)"
              >
                <div class="picker-avatar-box">
                  <img :src="`/Role/${char.id}.png`" :alt="char.displayName" class="picker-avatar game-sprite" @error="handleRoleIconError" />
                </div>
                <div class="picker-name" :style="{ color: getStepConfig(char.step).color }">
                  {{ char.displayName }}
                </div>
              </div>
            </div>
            <div v-if="filteredCharacters.length === 0" class="no-data-hint">
              没有找到匹配的角色
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 装备选择弹窗 -->
    <Transition name="fade">
      <div v-if="equipPicker.isOpen" class="modal-overlay" @click="closeEquipPicker">
        <div class="modal-card picker-modal-card equip-picker-modal-card" @click.stop>
          <div class="modal-header">
            <h3>选择装备 ({{ equipPicker.slotName }})</h3>
            <button class="close-btn" @click="closeEquipPicker">✕</button>
          </div>

          <!-- Sticky top search and filter section -->
          <div class="equip-sticky-top">
            <!-- 搜索框 -->
            <div class="equip-search-row">
              <div class="equip-search-box">
                <img src="/ui/search.svg" class="search-icon" />
                <input
                  type="text"
                  v-model="equipPicker.searchQuery"
                  placeholder="搜索装备名字、描述、词条..."
                  class="equip-search-input"
                />
              </div>
              <button class="sub-filter-btn" :class="{ active: pickerShowSubSearch }" @click="pickerShowSubSearch = !pickerShowSubSearch">
                <span class="filter-toggle-text">次筛</span>
                <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !pickerShowSubSearch }" />
              </button>
              <button class="filter-toggle-btn" @click="pickerTagsExpanded = !pickerTagsExpanded" style="margin-left: 6px;">
                <span class="filter-toggle-text">筛选</span>
                <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !pickerTagsExpanded }" />
              </button>
            </div>

            <!-- 二次筛选输入框 -->
            <Transition name="slide-fade">
              <div v-show="pickerShowSubSearch" class="sub-search-box">
                <img src="/ui/search.svg" class="sub-search-icon" />
                <input
                  type="text"
                  v-model="pickerSubSearchQuery"
                  placeholder="结果内二次筛选..."
                  class="sub-search-input"
                />
              </div>
            </Transition>

            <!-- 筛选面板 -->
            <div v-show="pickerTagsExpanded" class="filter-panel" style="margin-bottom: 8px;">
              <!-- 稀有度筛选 -->
              <div class="filter-row">
                <span class="filter-label">稀有度</span>
                <div class="filter-options">
                  <span
                    v-for="opt in stepOptions"
                    :key="opt.value"
                    :class="['tag', pickerSelectedStep === opt.value ? 'active' : '']"
                    @click="togglePickerFilter('step', opt.value)"
                  >
                    {{ opt.label }}
                  </span>
                </div>
              </div>

              <!-- 属性筛选 -->
              <div class="filter-row">
                <span class="filter-label">属性</span>
                <div class="filter-options">
                  <span
                    v-for="opt in attributeOptions"
                    :key="opt.value"
                    :class="['tag', pickerSelectedAttribute === opt.value ? 'active' : '']"
                    @click="togglePickerFilter('attribute', opt.value)"
                  >
                    {{ opt.label }}
                  </span>
                </div>
              </div>

              <!-- 职业筛选 -->
              <div class="filter-row" style="pointer-events: none; opacity: 0.85;">
                <span class="filter-label">职业</span>
                <div class="filter-options">
                  <span
                    v-for="opt in classOptions"
                    :key="opt.value"
                    :class="['tag', pickerSelectedClass === opt.value ? 'active' : '']"
                    @click="togglePickerFilter('class', opt.value)"
                  >
                    {{ opt.label }}
                  </span>
                </div>
              </div>

              <!-- 部位筛选 -->
              <div class="filter-row" style="pointer-events: none; opacity: 0.85;">
                <span class="filter-label">部位</span>
                <div class="filter-options">
                  <span
                    v-for="opt in typeOptions"
                    :key="opt.value"
                    :class="['tag', pickerSelectedType === opt.value ? 'active' : '']"
                    @click="togglePickerFilter('type', opt.value)"
                  >
                    {{ opt.label }}
                  </span>
                </div>
              </div>

              <!-- 地图筛选 -->
              <div class="filter-row" style="align-items: flex-start;">
                <span class="filter-label" style="width: 55px; flex-shrink: 0; padding-top: 3px;">地图</span>
                <div class="filter-options grid-5-cols">
                  <span
                    v-for="opt in mapOptions"
                    :key="opt.value"
                    :class="['tag', pickerSelectedMap === opt.value ? 'active' : '']"
                    @click="togglePickerFilter('map', opt.value)"
                  >
                    {{ opt.label }}
                  </span>
                </div>
              </div>
            </div>

             <!-- 效果标签筛选 -->
             <div v-if="pickerAllDisplayTags.length > 0" class="effect-filter-bar">
               <div class="effect-filter-header" @click="pickerEffectExpanded = !pickerEffectExpanded">
                 <span class="effect-filter-title">查找效果：</span>
                 <div class="effect-toggle-wrapper">
                   <span class="effect-toggle-text">{{ pickerEffectExpanded ? '点击收起' : '点击展开' }}</span>
                   <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !pickerEffectExpanded }" />
                 </div>
               </div>
              <div v-if="pickerEffectExpanded" class="categorized-effect-tags">
                <div v-for="group in pickerCategorizedTags" :key="group.name" class="tag-group-container">
                  <div class="tag-group-header">
                    <span class="group-title">{{ group.name }}</span>
                  </div>
                  <div class="effect-tags-list">
                    <span
                      v-for="tag in group.tags"
                      :key="tag"
                      :class="['effect-tag', isPickerActiveTag(tag) ? 'active' : '']"
                      @click="togglePickerFilterTag(tag)"
                    >
                      {{ formatTagText(tag) }}
                      <span v-if="isPickerActiveTag(tag)" class="tag-close-x">✕</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 检索数量统计 -->
            <div class="search-count-bar">
              当前检索装备数量：<span class="count-highlight">{{ filteredEquips.length }}</span>
            </div>


            <!-- 星级与传承配置行 -->
            <div class="picker-stars-config-row" style="display: flex; align-items: center; justify-content: flex-start; gap: 6px; margin: 8px 0 2px;">
              <span
                v-for="s in [0, 1, 2, 3]"
                :key="s"
                class="modal-star-tag"
                :class="{ active: pickerSelectedStar === s }"
                @click="pickerSelectedStar = s"
                style="padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; height: 24px; box-sizing: border-box; flex: none !important;"
              >
                {{ s }}星
              </span>
              <span
                class="modal-star-tag inherit-tag"
                :class="{ active: pickerSelectedInherit }"
                @click="pickerSelectedInherit = !pickerSelectedInherit"
                style="padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; height: 24px; box-sizing: border-box; flex: none !important;"
              >
                传承
              </span>
            </div>
          </div>

          <!-- List Container -->
          <div class="picker-list-wrapper equip-list-container" @scroll="handlePickerScroll">
            <div class="equip-detail-list">
              <div
                v-for="equip in pagedEquips"
                :key="equip.IDs"
                class="equip-detail-card picker-equip-card"
                @click="selectEquip(equip)"
              >
                <!-- Row 1: Icon, Name, and attributes on the right -->
                <div class="detail-row-first">
                  <div class="detail-card-left">
                    <div
                      class="equip-detail-icon-slot"
                      :style="{ backgroundColor: getStepConfig(equip.Step).lightBg }"
                    >
                      <img :src="`/Equip/${equip.IDs}.png`" :alt="equip.Name" class="equip-detail-icon game-sprite" @error="handleEquipIconError" />
                    </div>
                    <div class="equip-detail-name" :style="{ color: getStepConfig(equip.Step).color }">
                      {{ equip.Name }}
                    </div>
                  </div>

                  <!-- Right: attributes + expand button -->
                  <div class="detail-card-right-side">
                    <!-- Right attributes -->
                    <div class="detail-card-attributes">
                      <template v-for="attr in ATTRIBUTE_MAP" :key="attr.key">
                        <div v-if="getAttrVal(equip, attr.key, pickerSelectedStar) > 0" class="base-attr-tag">
                          <img :src="`/General/${attr.icon}`" class="attr-mini-icon game-sprite" />
                          <span>{{ getAttrVal(equip, attr.key, pickerSelectedStar) }}</span>
                        </div>
                      </template>
                    </div>
                    <!-- Collapse/Expand Arrow — always visible -->
                    <button class="expand-triangle-btn" @click.stop="togglePickerEquipBonds(equip.IDs)"
                      :class="{ 'btn-expanded': pickerExpandedEquips[equip.IDs] }">
                      <img src="/ui/up.svg" class="triangle-icon" :class="{ collapsed: !pickerExpandedEquips[equip.IDs] }" />
                    </button>
                  </div>
                </div>

                <!-- Collapsible Rows: Pure, Title, Enhance entries -->
                <div v-show="pickerExpandedEquips[equip.IDs]" class="collapsible-bonds-area" @click.stop="openEquipDetailWindow(equip)" style="cursor: pointer;">
                  <div class="detail-row-bond" v-for="bondKey in ['Pure', 'Title', 'Enhance']" :key="bondKey">
                    <template v-if="equip[bondKey]">
                      <div class="bond-meta-line">
                        <span class="bond-title-text" :style="{ color: getBondColor(equip[bondKey]) }">
                          {{ getBondDisplay(getBondNameWithLevelForPicker(equip[bondKey], bondKey)) }}
                        </span>
                        <span class="bond-type-tag">{{ getBondType(equip[bondKey]) }}</span>
                      </div>
                      <div class="bond-desc-line">
                        {{ getBondDesc(equip[bondKey]) }}
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="filteredEquips.length === 0" class="no-data-hint">
              未找到符合条件的装备
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 装备详情弹窗 (同款) -->
    <Transition name="fade">
      <div v-if="equipDetailModal.isOpen" class="modal-overlay" @click="closeEquipDetailWindow">
        <div class="equip-detail-window" @click.stop>
          <!-- 第1部分: 名称居中 -->
          <div class="equip-modal-header">
            <h2 class="centered-modal-title" :style="{ color: getStepConfig(equipDetailModal.data.Step).color }">
              {{ equipDetailModal.data.Name }}
            </h2>
            <button class="relic-modal-close" @click="closeEquipDetailWindow">✕</button>
          </div>

          <div class="equip-modal-body">
            <!-- 头部三栏布局：星级切换（左）、图标（中）、部位职业（右） -->
            <div class="modal-top-row">
              <!-- 左侧星级切换：使用类似tag的小尺寸按钮 -->
              <div class="modal-stars-left">
                <div class="star-row">
                  <span
                    v-for="star in [0, 1, 2]"
                    :key="star"
                    :class="['modal-star-tag', { active: selectedStar === star }]"
                    @click="selectedStar = star"
                  >
                    {{ star }}星
                  </span>
                </div>
                <div class="star-row">
                  <span
                    :class="['modal-star-tag', { active: selectedStar === 3 }]"
                    @click="selectedStar = 3"
                  >
                    3星
                  </span>
                  <span
                      :class="['modal-star-tag inherit-tag', { active: selectedInherit }]"
                      @click="toggleInherit"
                    >
                      传承
                    </span>
                </div>
              </div>

              <!-- 中间图标 -->
              <div class="modal-icon-center" :style="{ backgroundColor: getStepConfig(equipDetailModal.data.Step).lightBg }">
                <img :src="`/Equip/${equipDetailModal.data.IDs}.png`" class="relic-detail-img game-sprite" @error="handleEquipIconError" />
              </div>

              <!-- 右侧 2x2 网格标签 -->
              <div class="modal-tags-right">
                <!-- 左上 (Slot 1) -->
                <span v-if="modalTags.slot1" class="modal-info-tag class-tag">{{ modalTags.slot1 }}</span>
                <div v-else></div>

                <!-- 右上 (Slot 2) -->
                <span v-if="modalTags.slot2" class="modal-info-tag class-tag">{{ modalTags.slot2 }}</span>
                <div v-else></div>

                <!-- 左下 (Slot 3) -->
                <span v-if="modalTags.slot3" class="modal-info-tag type-tag">{{ modalTags.slot3 }}</span>
                <div v-else></div>

                <!-- 右下 (Slot 4) -->
                <span v-if="modalTags.slot4" class="modal-info-tag class-tag">{{ modalTags.slot4 }}</span>
                <div v-else></div>
              </div>
            </div>

            <!-- 装备描述 Description -->
            <div class="modal-description-row" v-if="equipDetailModal.data.Description">
              {{ equipDetailModal.data.Description }}
            </div>

            <!-- 第3部分: 装备属性 5个格子均分 -->
            <div class="modal-attributes-grid">
              <div
                v-for="i in 5"
                :key="i"
                class="attribute-cell-box"
              >
                <template v-if="getActiveAttributes(equipDetailModal.data)[i - 1]">
                  <img
                    :src="`/General/${getActiveAttributes(equipDetailModal.data)[i - 1].icon}`"
                    class="attr-grid-icon game-sprite"
                  />
                  <span class="attr-grid-val">
                    +{{ getAttrVal(equipDetailModal.data, getActiveAttributes(equipDetailModal.data)[i - 1].key, selectedStar) }}
                  </span>
                </template>
              </div>
            </div>

            <!-- 第4部分: 装备词条详细 -->
            <div class="modal-bonds-section">
              <div
                v-for="(bondKey, idx) in ['Pure', 'Title', 'Enhance']"
                :key="bondKey"
                class="bond-detail-item-box"
              >
                <template v-if="equipDetailModal.data[bondKey]">
                  <div class="bond-item-header" @click="toggleBondExpand(idx)">
                    <span class="bond-item-name" :style="{ color: getBondColor(equipDetailModal.data[bondKey]) }">
                      {{ getBondNameWithLevel(equipDetailModal.data[bondKey], bondKey) }}
                    </span>
                    <div class="bond-item-header-right">
                      <span class="bond-item-type">[{{ getBondType(equipDetailModal.data[bondKey]) }}]</span>
                      <img
                        src="/ui/up.svg"
                        class="bond-collapse-icon"
                        :class="{ collapsed: !expandedBonds[idx] }"
                      />
                    </div>
                  </div>
                  <div class="bond-item-basic-desc">
                    {{ getBondDesc(equipDetailModal.data[bondKey]) }}
                  </div>

                  <!-- 可折叠展开的效果列表 -->
                  <div v-show="expandedBonds[idx]" class="bond-expanded-list">
                    <div
                      v-for="(row, rIdx) in getBondRows(equipDetailModal.data[bondKey])"
                      :key="rIdx"
                      :class="['expanded-row', { active: isBondRowActive(equipDetailModal.data[bondKey], bondKey, rIdx) }]"
                    >
                      <span class="row-num">[{{ row.num }}]</span>
                      <span class="row-effect">{{ row.effect }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- 第5部分: 获取地图 -->
            <div class="modal-source-section">
              <div class="source-header-label">获取地图：</div>
              <div class="source-content-text">{{ equipDetailModal.data.AreaName || '不限' }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, nextTick, onMounted } from 'vue'
import { getVisibleCharacters } from '@/utils/characterFilter'
import rawRoles from '@/assets/RoleDataTable.json'
import rawBasicAttrs from '@/assets/BasicAttrDataTable.json'
import rawEquips from '@/assets/EquipDataTable.json'
import rawSupportArr from '@/assets/SubSkillDataTable.json'
import rawUniqueSkills from '@/assets/UniqueDataTable.json'
import rawBonds from '@/assets/BondDataTable.json'
import { getCategoryByTag } from '@/utils/tagCategories'
import * as configUtil from '@/utils/configTableUtil.js'

// --- Load Datasets ---
const rawRoleArr = configUtil.extractDataArray(rawRoles)
const rawEquipArr = configUtil.extractDataArray(rawEquips)
const rawSupportList = configUtil.extractDataArray(rawSupportArr)
const rawSkillList = configUtil.extractDataArray(rawUniqueSkills)
const rawBondArr = configUtil.extractDataArray(rawBonds)

const bondMap = new Map()
rawBondArr.forEach(b => {
  bondMap.set(b.Name, b)
})

// 属性与图标映射定义
const ATTRIBUTE_MAP = [
  { key: 'STR', name: '力量', icon: 'mid_ico_attribute_0004.png' },
  { key: 'INT', name: '精神', icon: 'mid_ico_attribute_0002.png' },
  { key: 'DEX', name: '敏捷', icon: 'mid_ico_attribute_0005.png' },
  { key: 'CONS', name: '生命', icon: 'mid_ico_attribute_0003.png' },
  { key: 'SPD', name: '速度', icon: 'mid_ico_attribute_0001.png' },
  { key: 'Luck', name: '幸运', icon: 'mid_ico_attribute_0010.png' },
  { key: 'Tough', name: '韧性', icon: 'mid_ico_attribute_0009.png' },
  { key: 'InitialMagic', name: '初始魔力', icon: 'mid_ico_attribute_0006.png' }
]

const attrNameToChinese = {
  STR: '力量',
  INT: '精神',
  DEX: '敏捷',
  CONS: '生命',
  SPD: '速度',
  Luck: '幸运',
  Tough: '韧性',
  InitialMagic: '初始魔力'
}

const allCharacters = shallowRef(getVisibleCharacters(configUtil.getFullCharacterList(rawRoleArr, {
  supportList: rawSupportList, skillList: rawSkillList, talentList: [], relicList: [], noteList: []
})))

const leftEquipSlots = ['主手', '副手', '项链', '徽章', '戒指']
const rightEquipSlots = ['头部', '身体', '护手', '腰带', '鞋子']

const leftTeam = ref([null, null, null])
const rightTeam = ref([null, null, null])

// ====== 新增：队伍持久化 ======
const STORAGE_KEY = 'battle_sim_teams_v1'

// 初始化时从本地读取缓存
onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.leftTeam) leftTeam.value = data.leftTeam
      if (data.rightTeam) rightTeam.value = data.rightTeam
    } catch (e) {
      console.error('读取队伍配置失败', e)
    }
  }
})

// 深度监听队伍变化，自动保存到本地
watch([leftTeam, rightTeam], () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    leftTeam: leftTeam.value,
    rightTeam: rightTeam.value
  }))
}, { deep: true })

// --- Battle Logs State ---
const battleLogs = shallowRef([])
const logContainerRef = ref(null)
const activePreviewSkill = ref(null)

function getNowTime() {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
}

function addLog(text, type = 'info') {
  battleLogs.value = [...battleLogs.value, { time: getNowTime(), text, type }]
  nextTick(() => {
    if (logContainerRef.value) {
      logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight
    }
  })
}

const simulateBattle = () => {
  battleLogs.value = []
  let leftNames = leftTeam.value.filter(c => c !== null).map(c => c.displayName)
  let rightNames = rightTeam.value.filter(c => c !== null).map(c => c.displayName)
  let defaultLeft = leftNames.length > 0 ? leftNames[0] : '我方守卫'
  let defaultRight = rightNames.length > 0 ? rightNames[0] : '敌方怪物'

  addLog('--- 战斗模拟开始 ---', 'sys')
  for (let round = 1; round <= 5; round++) {
    setTimeout(() => {
      addLog(`[第 ${round} 回合] 开始`, 'sys')
      addLog(`【我方】${defaultLeft} 发动了攻击，但被星界邪神偷走了`, 'info')
      addLog(`【敌方】${defaultRight} 发动了攻击，但被星界邪神偷走`, 'warn')
      addLog(`【敌方】${defaultRight} 发动了攻击，但被星界邪神偷走`, 'warn')

      if (round === 3) {
        addLog(`【我方】${defaultLeft} 发动了攻击，但被星界邪神偷走`, 'success')
      }
      if (round === 5) {
        addLog(`【敌方】${defaultRight} 生命值耗尽，倒下了！`, 'success')
        addLog(`--- 战斗结束，我方取得胜利 ---`, 'sys')
      }
    }, round * 400)
  }
}

// --- Modal States ---
const detailModal = ref({ isOpen: false, side: '', idx: null, char: null })
const pickerModal = ref({ isOpen: false, side: '', idx: null, searchQuery: '' })
const equipPicker = ref({ isOpen: false, slotName: '', searchQuery: '' })

const getStepConfig = (step) => {
  const map = {
    'SS': { label: '神话', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', lightBg: 'rgba(239, 68, 68, 0.08)' },
    'S': { label: '传说', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', lightBg: 'rgba(249, 115, 22, 0.08)' },
    'A': { label: '史诗', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', lightBg: 'rgba(168, 85, 247, 0.08)' },
    'B': { label: '稀有', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', lightBg: 'rgba(59, 130, 246, 0.08)' },
    'C': { label: '普通', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', lightBg: 'rgba(16, 185, 129, 0.08)' }
  }
  return map[step] || { label: step, color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', lightBg: 'rgba(100, 116, 139, 0.08)' }
}

const getEquipColor = (step) => {
  const map = { 'SS': '#ef4444', 'S': '#f97316', 'A': '#a855f7', 'B': '#3b82f6', 'C': '#10b981' }
  return map[step] || '#64748b'
}

const getSubSkillData = (id) => {
  if (!id) return { name: '未知', formattedDesc: '暂无数据', icon: 'TB00011' }
  const rawSkill = rawSupportList.find(item => item.IDs === id)
  if (!rawSkill) return { name: '未知', formattedDesc: '暂无数据', icon: 'TB00011' }
  const valueList = [rawSkill.Value0, rawSkill.Value1, rawSkill.Value2]
  return {
    name: rawSkill.Name,
    icon: rawSkill.Icon || 'TB00001',
    formattedDesc: configUtil.replacePlaceholders(rawSkill.Description, valueList)
  }
}

// --- 底部 6 格技能特性 ---
const mappedFeatures = computed(() => {
  const char = detailModal.value.char
  if (!char) return []

  const currentStar = char.star || 1

  let skillName = '暂无技能', skillDesc = '无描述', skillIconStr = 'TB00011'
  if (char.activeSkills && char.activeSkills.length > 0) {
    skillName = char.activeSkills[0].name
    skillDesc = char.activeSkills[0].formattedDesc || char.activeSkills[0].description || '无详细描述'
    skillIconStr = char.activeSkills[0].icon
  }

  let normalName = char.normalAttack?.name || '普通攻击', normalDesc = '无描述', normalIconStr = 'TB00011'
  if (char.normalAttack?.id) {
    const detail = getSubSkillData(char.normalAttack.id)
    normalName = detail.name
    normalDesc = detail.formattedDesc
    normalIconStr = detail.icon
  }

  let raceName = char.race?.name || '种族特性', raceDesc = '无描述', raceIconStr = 'TB20011'
  if (char.race?.id) {
    const detail = getSubSkillData(char.race.id)
    raceName = detail.name
    raceDesc = detail.formattedDesc
    raceIconStr = detail.icon
  }

  let characteristicName = char.supportSkills?.characteristic?.name || '性格特性'
  let characteristicDesc = char.supportSkills?.characteristic?.formattedDesc || '无描述'
  let characteristicIconStr = char.supportSkills?.characteristic?.icon || 'TB00001'

  let subClassName = char.supportSkills?.subClass?.name || '专属称号'
  let subClassDesc = char.supportSkills?.subClass?.formattedDesc || '无描述'
  let subClassIconStr = char.supportSkills?.subClass?.icon || 'TB00001'

  let displayNameText = char.supportSkills?.feature?.name || '特殊特性'
  let displayDescText = char.supportSkills?.feature?.formattedDesc || '无描述'
  let displayIconStr = char.supportSkills?.feature?.icon || 'TB00001'

  return [
    { label: '技能', unlockStar: 1, isUnlocked: currentStar >= 1, name: skillName, desc: skillDesc, icon: `/Skill/${skillIconStr}.png` },
    { label: '普攻', unlockStar: 1, isUnlocked: currentStar >= 1, name: normalName, desc: normalDesc, icon: `/Skill/${normalIconStr}.png` },
    { label: '种族', unlockStar: 2, isUnlocked: currentStar >= 2, name: raceName, desc: raceDesc, icon: `/Skill/${raceIconStr}.png` },
    { label: '性格', unlockStar: 3, isUnlocked: currentStar >= 3, name: characteristicName, desc: characteristicDesc, icon: `/Skill/${characteristicIconStr}.png` },
    { label: '称号', unlockStar: 4, isUnlocked: currentStar >= 4, name: subClassName, desc: subClassDesc, icon: `/Skill/${subClassIconStr}.png` },
    { label: '特性', unlockStar: 5, isUnlocked: currentStar >= 5, name: displayNameText, desc: displayDescText, icon: `/Skill/${displayIconStr}.png` }
  ]
})

// --- 词条总览：统计角色当前所有装备的词条叠加 ---
const characterBondSummary = computed(() => {
  const char = detailModal.value.char
  if (!char) return []

  const allSlots = [...leftEquipSlots, ...rightEquipSlots]
  const bondTotals = {} // name -> totalLevel

  for (const slotName of allSlots) {
    const equip = char.equips?.[slotName]
    if (!equip) continue

    const star = equip.star || 0
    const inherit = equip.inherit || false

    for (const bondKey of ['Pure', 'Title', 'Enhance']) {
      const bondStr = equip[bondKey]
      if (!bondStr) continue
      const info = parseBondInfo(bondStr)
      if (!info) continue

      let lvl = info.baseLvl
      if (bondKey === 'Pure' && star >= 1) lvl += 1
      if (bondKey === 'Title' && star >= 2) lvl += 1
      if (bondKey === 'Enhance' && star >= 3) lvl += 1
      if (inherit) lvl += 1

      bondTotals[info.name] = (bondTotals[info.name] || 0) + lvl
    }
  }

  // 构建展示数组
  return Object.entries(bondTotals)
    .map(([name, totalLevel]) => {
      const bObj = bondMap.get(name)
      if (!bObj) return null

      // 计算阈值激活情况
      const thresholds = bObj.BondNum ? bObj.BondNum.split(',').map(Number) : []
      const val1 = bObj.Value1 ? bObj.Value1.split(',') : []
      const val2 = bObj.Value2 ? bObj.Value2.split(',') : []
      const val3 = bObj.Value3 ? bObj.Value3.split(',') : []
      const descTemplate = bObj.EffectDescription || bObj.BasicDescription || ''

      const rows = thresholds.map((num, idx) => {
        let effect = descTemplate
        effect = effect.replace('{0}', val1[idx] !== undefined ? val1[idx] : '')
        effect = effect.replace('{1}', val2[idx] !== undefined ? val2[idx] : '')
        effect = effect.replace('{2}', val3[idx] !== undefined ? val3[idx] : '')
        return { num, effect }
      })

      // 找到最高激活阈值索引
      let unlockedIdx = -1
      for (let i = 0; i < thresholds.length; i++) {
        if (thresholds[i] <= totalLevel) unlockedIdx = i
      }

      // 词条颜色
      const color = bObj.Step ? getStepConfig(bObj.Step).color : '#64748b'

      return {
        name,
        totalLevel,
        type: bObj.Type || '基础',
        color,
        rows,
        unlockedIdx
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.totalLevel - a.totalLevel)
})

const handleFeatureClick = (feat, fIdx) => {
  if (activePreviewSkill.value && activePreviewSkill.value.fIdx === fIdx) {
    activePreviewSkill.value = null
  } else {
    activePreviewSkill.value = {
      fIdx: fIdx,
      name: feat.name + (!feat.isUnlocked ? ` (${feat.unlockStar}星解锁)` : ''),
      desc: feat.desc
    }
  }
}

// --- Team Management ---
const handleSlotClick = (side, idx) => {
  const team = side === 'left' ? leftTeam : rightTeam
  const existing = team.value[idx]
  if (existing) {
    activePreviewSkill.value = null
    detailModal.value = { isOpen: true, side, idx, char: existing }
  } else {
    pickerModal.value = { isOpen: true, side, idx, searchQuery: '' }
  }
}

const removeCharacter = (side, idx) => {
  const team = side === 'left' ? leftTeam : rightTeam
  team.value[idx] = null
}

const openSideConfig = (side) => {
  let team = side === 'left' ? leftTeam : rightTeam
  let emptyIdx = team.value.findIndex(c => c === null)
  if (emptyIdx === -1) emptyIdx = 0
  pickerModal.value = { isOpen: true, side, idx: emptyIdx, searchQuery: '' }
}

const closePickerModal = () => { pickerModal.value.isOpen = false }

const filteredCharacters = computed(() => {
  const q = pickerModal.value.searchQuery.trim().toLowerCase()
  if (!q) return allCharacters.value
  return allCharacters.value.filter(char =>
    char.displayName.toLowerCase().includes(q) ||
    char.name.toLowerCase().includes(q)
  )
})

const selectCharacter = (char) => {
  const { side, idx } = pickerModal.value
  const targetTeam = side === 'left' ? leftTeam : rightTeam
  const initialEquips = {}
  leftEquipSlots.concat(rightEquipSlots).forEach(slot => { initialEquips[slot] = null })

  let defaultStar = 1
  if (char.step === 'S') defaultStar = 3
  else if (char.step === 'A') defaultStar = 2

  targetTeam.value[idx] = { ...char, level: 1, star: defaultStar, equips: initialEquips }
  closePickerModal()
}

// --- Detail Modal Functions ---
const closeDetailModal = () => {
  detailModal.value.isOpen = false
  detailModal.value.char = null
  activePreviewSkill.value = null
}

const toggleStarLevel = () => {
  if (!detailModal.value.char) return
  const char = detailModal.value.char
  let currentStar = char.star || 1

  // 计算当前角色的默认星级（和选择角色时的规则保持一致）
  let defaultStar = 1
  if (char.step === 'S') defaultStar = 3
  else if (char.step === 'A') defaultStar = 2

  // 达到5星则回到默认星级，否则星级+1
  currentStar = currentStar >= 5 ? defaultStar : currentStar + 1

  detailModal.value.char.star = currentStar
  activePreviewSkill.value = null
}

const adjustLevel = (amount) => {
  if (!detailModal.value.char) return
  let lvl = (detailModal.value.char.level || 1) + amount
  if (lvl < 1) lvl = 1
  if (lvl > 100) lvl = 100
  detailModal.value.char.level = lvl
}

watch(() => detailModal.value.char?.level, (newVal) => {
  if (!detailModal.value.char || newVal === undefined) return
  if (typeof newVal !== 'number' || isNaN(newVal)) return
  if (newVal < 1) detailModal.value.char.level = 1
  if (newVal > 100) detailModal.value.char.level = 100
})

// --- Equipment Picker and Detail States ---
const pickerSubSearchQuery = ref('')
const pickerShowSubSearch = ref(false)
const pickerTagsExpanded = ref(false)
const pickerSelectedStep = ref('all')
const pickerSelectedAttribute = ref('all')
const pickerSelectedClass = ref('all')
const pickerSelectedType = ref('all')
const pickerSelectedMap = ref('all')
const pickerSelectedFilterTags = ref([])
const pickerEffectExpanded = ref(false)
const pickerExpandedEquips = ref({})
const pickerDisplayLimit = ref(15)

const pickerSelectedStar = ref(0)
const pickerSelectedInherit = ref(false)



const equipDetailModal = ref({ isOpen: false, data: null })
const selectedStar = ref(0)
const selectedInherit = ref(false)
const expandedBonds = ref([false, false, false])

// 词条总览每项词条的展开收起状态，默认收起
const expandedSummaryBonds = ref({})


const openEquipPicker = (slotName) => {
  const char = detailModal.value.char
  const charClass = char ? char.class : 'all'

  // 自带筛选：自带当前角色的职业与当前槽位的部位筛选
  pickerSelectedClass.value = charClass
  pickerSelectedType.value = slotName

  // 重置其他搜索状态
  pickerSubSearchQuery.value = ''
  pickerShowSubSearch.value = false
  pickerTagsExpanded.value = false
  pickerSelectedStep.value = 'all'
  pickerSelectedAttribute.value = 'all'
  pickerSelectedMap.value = 'all'
  pickerSelectedFilterTags.value = []
  pickerDisplayLimit.value = 15

  equipPicker.value = { isOpen: true, slotName, searchQuery: '' }
}

const closeEquipPicker = () => {
  equipPicker.value.isOpen = false
}

const removeEquip = (slotName) => {
  if (detailModal.value.char) {
    detailModal.value.char.equips[slotName] = null
  }
}

const selectEquip = (eq) => {
  if (detailModal.value.char) {
    detailModal.value.char.equips[equipPicker.value.slotName] = {
      ...eq,
      star: pickerSelectedStar.value,
      inherit: pickerSelectedInherit.value // [!code 修改了这里，移除 SS 限制]
    }
  }
  closeEquipPicker()
}

// 词条辅助展示函数
const parseBondInfo = (bondStr) => {
  if (!bondStr) return null
  const m = bondStr.match(/^(.+)\[(\d+)\]$/)
  if (m) {
    return { name: m[1], baseLvl: parseInt(m[2]) }
  }
  return { name: bondStr, baseLvl: 1 }
}

const getBondDisplay = (bondStr) => {
  const info = parseBondInfo(bondStr)
  if (!info) return ''
  return `${info.name}[${info.baseLvl}]`
}

const getBondType = (bondStr) => {
  const info = parseBondInfo(bondStr)
  if (!info) return '基础'
  const bObj = bondMap.get(info.name)
  return bObj ? bObj.Type : '基础'
}

const getBondDesc = (bondStr) => {
  const info = parseBondInfo(bondStr)
  if (!info) return ''
  const bObj = bondMap.get(info.name)
  return bObj ? bObj.BasicDescription : ''
}

const getBondColor = (bondStr) => {
  const info = parseBondInfo(bondStr)
  if (!info) return '#64748b'
  const bObj = bondMap.get(info.name)
  if (!bObj || !bObj.Step) return '#64748b'
  return getStepConfig(bObj.Step).color
}

// 星级称号成长显示
const getBondNameWithLevel = (bondStr, bondKey) => {
  const info = parseBondInfo(bondStr)
  if (!info) return ''
  let currentLvl = info.baseLvl
  if (bondKey === 'Pure' && selectedStar.value >= 1) currentLvl += 1
  if (bondKey === 'Title' && selectedStar.value >= 2) currentLvl += 1
  if (bondKey === 'Enhance' && selectedStar.value >= 3) currentLvl += 1
  if (selectedInherit.value) currentLvl += 1
  return `${info.name}[${currentLvl}]`
}

const getBondNameWithLevelForPicker = (bondStr, bondKey) => {
  const info = parseBondInfo(bondStr)
  if (!info) return ''
  let currentLvl = info.baseLvl
  if (bondKey === 'Pure' && pickerSelectedStar.value >= 1) currentLvl += 1
  if (bondKey === 'Title' && pickerSelectedStar.value >= 2) currentLvl += 1
  if (bondKey === 'Enhance' && pickerSelectedStar.value >= 3) currentLvl += 1
  if (pickerSelectedInherit.value) currentLvl += 1
  return `${info.name}[${currentLvl}]`
}

const getBondRows = (bondStr) => {
  const info = parseBondInfo(bondStr)
  if (!info) return []
  const bObj = bondMap.get(info.name)
  if (!bObj || !bObj.BondNum) return []
  const nums = bObj.BondNum.split(',')
  const val1 = bObj.Value1 ? bObj.Value1.split(',') : []
  const val2 = bObj.Value2 ? bObj.Value2.split(',') : []
  const val3 = bObj.Value3 ? bObj.Value3.split(',') : []
  const desc = bObj.EffectDescription || bObj.BasicDescription || ''
  return nums.map((num, idx) => {
    let formatted = desc
    formatted = formatted.replace('{0}', val1[idx] !== undefined ? val1[idx] : '')
    formatted = formatted.replace('{1}', val2[idx] !== undefined ? val2[idx] : '')
    formatted = formatted.replace('{2}', val3[idx] !== undefined ? val3[idx] : '')
    return { num, effect: formatted }
  })
}

const isBondRowActive = (bondStr, bondKey, rIdx) => {
  const info = parseBondInfo(bondStr)
  if (!info) return false
  let currentLvl = info.baseLvl
  if (bondKey === 'Pure' && selectedStar.value >= 1) currentLvl += 1
  if (bondKey === 'Title' && selectedStar.value >= 2) currentLvl += 1
  if (bondKey === 'Enhance' && selectedStar.value >= 3) currentLvl += 1
  if (selectedInherit.value) currentLvl += 1
  const bObj = bondMap.get(info.name)
  if (!bObj || !bObj.BondNum) return false
  const nums = bObj.BondNum.split(',').map(Number)
  let activeIdx = -1
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] <= currentLvl) activeIdx = i
  }
  return rIdx === activeIdx
}

const getActiveAttributes = (item) => {
  if (!item) return []
  const active = []
  const upAttrs = item.UpgradeAttr ? item.UpgradeAttr.split(/[\s,，]+/).filter(Boolean) : []
  ATTRIBUTE_MAP.forEach(attr => {
    const base = item[attr.key] > 0
    const inUp = upAttrs.includes(attrNameToChinese[attr.key])
    if (base || inUp) active.push(attr)
  })
  return active
}

const getAttrVal = (item, attrName, star) => {
  const baseVal = item[attrName] !== undefined ? item[attrName] : 0
  if (!item.UpgradeAttr) return baseVal
  const attrs = item.UpgradeAttr.split(/[\s,，]+/).filter(Boolean)
  const idx = attrs.indexOf(attrNameToChinese[attrName])
  if (idx < 0 || idx > 2) return baseVal

  const step = item.Step || 'B'
  let increment = 0
  if (step === 'B' || step === 'C') {
    if (star === 1) {
      if (idx === 0) increment = 1
    } else if (star === 2) {
      if (idx === 0 || idx === 1) increment = 1
    } else if (star >= 3) {
      increment = 1
    }
  } else if (step === 'A') {
    if (star === 1) {
      if (idx === 0 || idx === 1) increment = 1
    } else if (star === 2) {
      if (idx === 0) increment = 1
      if (idx === 1) increment = 2
      if (idx === 2) increment = 1
    } else if (star >= 3) {
      increment = 2
    }
  } else if (step === 'S') {
    if (star === 1) {
      if (idx === 0) increment = 2
      if (idx === 1 || idx === 2) increment = 1
    } else if (star === 2) {
      if (idx === 0 || idx === 1) increment = 3
      if (idx === 2) increment = 2
    } else if (star >= 3) {
      increment = 4
    }
  } else if (step === 'SS') {
    if (star === 1) {
      if (idx === 0 || idx === 1) increment = 3
      if (idx === 2) increment = 2
    } else if (star === 2) {
      if (idx === 0) increment = 6
      if (idx === 1 || idx === 2) increment = 5
    } else if (star >= 3) {
      increment = 8
    }
  }
  return baseVal + increment
}

// 标签与搜索词过滤
const processedEquips = computed(() => {
  return rawEquipArr.map(item => {
    const tags = new Set()
    for (const key of ['Pure', 'Title', 'Enhance']) {
      const val = item[key]
      if (val) {
        const info = parseBondInfo(val)
        if (info) {
          const bObj = bondMap.get(info.name)
          if (bObj && bObj.Tag) {
            bObj.Tag.split(/[\s,，]+/).forEach(t => {
              const clean = t.trim()
              if (clean) tags.add(clean)
            })
          }
        }
      }
    }
    return { ...item, filterTags: Array.from(tags) }
  })
})

const primaryFilteredEquips = computed(() => {
  return processedEquips.value.filter(item => {
    const q = (equipPicker.value.searchQuery || '').trim().toLowerCase()
    if (q) {
      const matchName = item.Name && item.Name.toLowerCase().includes(q)
      const matchDesc = item.Description && item.Description.toLowerCase().includes(q)
      const matchTag = item.filterTags && item.filterTags.some(t => t.toLowerCase().includes(q))
      let matchBonds = false
      for (const key of ['Pure', 'Title', 'Enhance']) {
        const val = item[key]
        if (val) {
          if (val.toLowerCase().includes(q)) { matchBonds = true; break }
          const info = parseBondInfo(val)
          if (info) {
            const bObj = bondMap.get(info.name)
            if (bObj) {
              const matchBondName = bObj.Name && bObj.Name.toLowerCase().includes(q)
              const matchBondBasic = bObj.BasicDescription && bObj.BasicDescription.toLowerCase().includes(q)
              const matchBondEffect = bObj.EffectDescription && bObj.EffectDescription.toLowerCase().includes(q)
              if (matchBondName || matchBondBasic || matchBondEffect) { matchBonds = true; break }
            }
          }
        }
      }
      if (!matchName && !matchDesc && !matchBonds && !matchTag) return false
    }

    if (pickerSelectedStep.value !== 'all' && item.Step !== pickerSelectedStep.value) return false

    if (pickerSelectedAttribute.value !== 'all') {
      const cnName = attrNameToChinese[pickerSelectedAttribute.value]
      const hasBase = item[pickerSelectedAttribute.value] > 0
      const hasUpgrade = item.UpgradeAttr && item.UpgradeAttr.includes(cnName)
      if (!hasBase && !hasUpgrade) return false
    }

    if (pickerSelectedClass.value !== 'all') {
      if (pickerSelectedClass.value === '全职') {
        if (item.Class !== '全职') return false
      } else {
        if (item.Class !== '全职' && !item.Class.includes(pickerSelectedClass.value)) return false
      }
    }

    if (pickerSelectedType.value !== 'all' && item.Type !== pickerSelectedType.value) return false

    if (pickerSelectedMap.value !== 'all') {
      if (item.AreaType !== pickerSelectedMap.value && item.AreaName !== pickerSelectedMap.value) return false
    }

    return true
  })
})

const tagFilteredEquips = computed(() => {
  const list = primaryFilteredEquips.value
  if (pickerSelectedFilterTags.value.length === 0) return list
  return list.filter(item => {
    return pickerSelectedFilterTags.value.every(tag => item.filterTags && item.filterTags.includes(tag))
  })
})

const pickerQueryKeywords = computed(() => {
  const qStr = (equipPicker.value.searchQuery || '').trim().toLowerCase()
  const subQStr = (pickerSubSearchQuery.value || '').trim().toLowerCase()
  return [
    ...qStr.split(/[\s,，]+/).filter(Boolean),
    ...subQStr.split(/[\s,，]+/).filter(Boolean)
  ]
})

const isPickerActiveTag = (tag) => {
  const lowerTag = tag.toLowerCase()
  return pickerSelectedFilterTags.value.includes(tag) || pickerQueryKeywords.value.includes(lowerTag)
}

const pickerAllDisplayTags = computed(() => {
  const tags = new Set()
  pickerSelectedFilterTags.value.forEach(t => tags.add(t))
  const keywords = pickerQueryKeywords.value

  const dbTags = new Set()
  processedEquips.value.forEach(item => {
    if (item.filterTags) item.filterTags.forEach(t => dbTags.add(t))
  })

  dbTags.forEach(t => {
    if (keywords.includes(t.toLowerCase())) tags.add(t)
  })

  tagFilteredEquips.value.forEach(item => {
    if (item.filterTags) item.filterTags.forEach(t => tags.add(t))
  })

  const combinedList = Array.from(tags)
  combinedList.sort((a, b) => {
    const rA = pickerSelectedFilterTags.value.includes(a) ? 1 : 5
    const rB = pickerSelectedFilterTags.value.includes(b) ? 1 : 5
    if (rA !== rB) return rA - rB
    return a.localeCompare(b, 'zh')
  })
  return combinedList
})

const pickerCategorizedTags = computed(() => {
  const groups = { "数值": [], "机制": [], "时机": [], "状态": [], "其他": [] }
  pickerAllDisplayTags.value.forEach(tag => {
    const category = getCategoryByTag(tag)
    if (groups[category]) groups[category].push(tag)
    else groups["其他"].push(tag)
  })
  return Object.entries(groups)
    .filter(([_, tags]) => tags.length > 0)
    .map(([name, tags]) => {
      const sortedTags = [...tags].sort((a, b) => b.length - a.length)
      return { name, tags: sortedTags }
    })
})

const removeKeywordFromPickerSearch = (tag) => {
  const lowerTag = tag.toLowerCase()
  const filterInput = (refVar) => {
    const val = refVar.value || ''
    const words = val.split(/[\s,，]+/).filter(Boolean)
    const filtered = words.filter(w => w.toLowerCase() !== lowerTag)
    refVar.value = filtered.join(' ')
  }
  const words = (equipPicker.value.searchQuery || '').split(/[\s,，]+/).filter(Boolean)
  equipPicker.value.searchQuery = words.filter(w => w.toLowerCase() !== lowerTag).join(' ')
  filterInput(pickerSubSearchQuery)
}

const togglePickerFilterTag = (tag) => {
  const inSelected = pickerSelectedFilterTags.value.includes(tag)
  if (inSelected) {
    const idx = pickerSelectedFilterTags.value.indexOf(tag)
    pickerSelectedFilterTags.value.splice(idx, 1)
  } else {
    pickerSelectedFilterTags.value.push(tag)
  }
  pickerDisplayLimit.value = 15
}

const filteredEquips = computed(() => {
  const list = tagFilteredEquips.value
  const subQ = pickerSubSearchQuery.value.trim().toLowerCase()
  let result = list
  if (subQ) {
    result = list.filter(item => {
      const matchName = item.Name && item.Name.toLowerCase().includes(subQ)
      const matchDesc = item.Description && item.Description.toLowerCase().includes(subQ)
      const matchTag = item.filterTags && item.filterTags.some(t => t.toLowerCase().includes(subQ))
      let matchBonds = false
      for (const key of ['Pure', 'Title', 'Enhance']) {
        const val = item[key]
        if (val) {
          if (val.toLowerCase().includes(subQ)) { matchBonds = true; break }
          const info = parseBondInfo(val)
          if (info) {
            const bObj = bondMap.get(info.name)
            if (bObj) {
              const matchBondName = bObj.Name && bObj.Name.toLowerCase().includes(subQ)
              const matchBondBasic = bObj.BasicDescription && bObj.BasicDescription.toLowerCase().includes(subQ)
              const matchBondEffect = bObj.EffectDescription && bObj.EffectDescription.toLowerCase().includes(subQ)
              if (matchBondName || matchBondBasic || matchBondEffect) { matchBonds = true; break }
            }
          }
        }
      }
      return matchName || matchDesc || matchBonds || matchTag
    })
  }

  return [...result].sort((a, b) => {
    const stepA = getStepWeight(a.Step)
    const stepB = getStepWeight(b.Step)
    if (stepA !== stepB) return stepA - stepB
    const mapA = getMapWeight(a.AreaName)
    const mapB = getMapWeight(b.AreaName)
    return mapA - mapB
  })
})

const pagedEquips = computed(() => {
  return filteredEquips.value.slice(0, pickerDisplayLimit.value)
})

const handlePickerScroll = (e) => {
  const el = e.target
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
    if (pickerDisplayLimit.value < filteredEquips.value.length) {
      pickerDisplayLimit.value += 15
    }
  }
}

const togglePickerFilter = (type, value) => {
  pickerDisplayLimit.value = 15
  if (type === 'step') {
    pickerSelectedStep.value = pickerSelectedStep.value === value ? 'all' : value
  } else if (type === 'attribute') {
    pickerSelectedAttribute.value = pickerSelectedAttribute.value === value ? 'all' : value
  } else if (type === 'class') {
    pickerSelectedClass.value = pickerSelectedClass.value === value ? 'all' : value
  } else if (type === 'type') {
    pickerSelectedType.value = pickerSelectedType.value === value ? 'all' : value
  } else if (type === 'map') {
    pickerSelectedMap.value = pickerSelectedMap.value === value ? 'all' : value
  }
}

// 列表内展开词条控制
const togglePickerEquipBonds = (equipId) => {
  pickerExpandedEquips.value = {
    ...pickerExpandedEquips.value,
    [equipId]: !pickerExpandedEquips.value[equipId]
  }
}

// 展开装备同款详细属性弹窗
const openEquipDetailWindow = (equip) => {
  selectedStar.value = 0
  selectedInherit.value = equip.Step === 'SS'
  expandedBonds.value = [false, false, false]
  equipDetailModal.value = { isOpen: true, data: equip }
}

const closeEquipDetailWindow = () => {
  equipDetailModal.value = { isOpen: false, data: null }
}

const modalTags = computed(() => {
  const equip = equipDetailModal.value.data
  if (!equip) return { slot1: '', slot2: '', slot3: '', slot4: '' }
  const classes = getEquipClasses(equip.Class)
  let s1 = '', s2 = '', s3 = equip.Type || '', s4 = ''
  if (classes.length === 1) s4 = classes[0]
  else if (classes.length === 2) { s4 = classes[0]; s2 = classes[1] }
  else if (classes.length >= 3) { s4 = classes[0]; s2 = classes[1]; s1 = classes[2] }
  return { slot1: s1, slot2: s2, slot3: s3, slot4: s4 }
})

const getEquipClasses = (classStr) => {
  if (!classStr) return []
  if (classStr === '全职') return ['通用']
  return classStr.split(/[\s,，]+/).filter(Boolean)
}

const toggleInherit = () => {
  // [!code 删除了 if (equipDetailModal.value.data?.Step === 'SS') return]
  selectedInherit.value = !selectedInherit.value
}

const toggleBondExpand = (idx) => {
  expandedBonds.value[idx] = !expandedBonds.value[idx]
}

// 辅助函数：格式化显示的标签文本（去掉末尾"相关"）
const formatTagText = (tag) => {
  if (tag.endsWith('相关')) {
    return tag.slice(0, -2)
  }
  return tag
}

// Options options
const stepOptions = [
  { label: '全部', value: 'all' },
  { label: '普通', value: 'C' },
  { label: '稀有', value: 'B' },
  { label: '史诗', value: 'A' },
  { label: '传说', value: 'S' },
  { label: '神话', value: 'SS' }
]

const attributeOptions = [
  { label: '全部', value: 'all' },
  { label: '力量', value: 'STR' },
  { label: '精神', value: 'INT' },
  { label: '敏捷', value: 'DEX' },
  { label: '生命', value: 'CONS' },
  { label: '速度', value: 'SPD' },
  { label: '幸运', value: 'Luck' },
  { label: '韧性', value: 'Tough' },
  { label: '初始魔力', value: 'InitialMagic' }
]

const classOptions = [
  { label: '全部', value: 'all' },
  { label: '通用', value: '全职' },
  { label: '战士', value: '战士' },
  { label: '射手', value: '射手' },
  { label: '法师', value: '法师' },
  { label: '牧师', value: '牧师' }
]

const typeOptions = [
  { label: '全部', value: 'all' },
  { label: '主手', value: '主手' },
  { label: '副手', value: '副手' },
  { label: '头部', value: '头部' },
  { label: '身体', value: '身体' },
  { label: '护手', value: '护手' },
  { label: '腰带', value: '腰带' },
  { label: '鞋子', value: '鞋子' },
  { label: '徽章', value: '徽章' },
  { label: '项链', value: '项链' },
  { label: '戒指', value: '戒指' }
]

const mapOptions = [
  { label: '全部', value: 'all' },
  { label: '世界', value: '世界' },
  { label: '新生平原', value: '新生平原' },
  { label: '广袤草原', value: '广袤草原' },
  { label: '铁血高地', value: '铁血高地' },
  { label: '迷失森林', value: '迷失森林' },
  { label: '幽暗密林', value: '幽暗密林' },
  { label: '清凉沙滩', value: '清凉沙滩' },
  { label: '遗忘之海', value: '遗忘之海' },
  { label: '废弃矿洞', value: '废弃矿洞' },
  { label: '洞穴深处', value: '洞穴深处' },
  { label: '极寒冰原', value: '极寒冰原' },
  { label: '荒凉戈壁', value: '荒凉戈壁' },
  { label: '无尽荒漠', value: '无尽荒漠' },
  { label: '熔岩通道', value: '熔岩通道' }
]





const getStepWeight = (step) => {
  const weights = { 'SS': 1, 'S': 2, 'A': 3, 'B': 4, 'C': 5 }
  return weights[step] || 99
}

const getMapWeight = (map) => {
  const weights = {
    '世界': 1, '新生平原': 2, '广袤草原': 3, '铁血高地': 4,
    '迷失森林': 5, '幽暗密林': 6, '清凉沙滩': 7, '遗忘之海': 8,
    '废弃矿洞': 9, '洞穴深处': 10, '极寒冰原': 11, '荒凉戈壁': 12,
    '无尽荒漠': 13, '熔岩通道': 14
  }
  return weights[map] || 99
}

// --- 属性计算 ---
const calculatedStats = computed(() => {
  const char = detailModal.value.char
  if (!char) return []

  const searchNames = [char.class, char.type, char.element, char.map, char.step].filter(Boolean)
  const sums = { CONS: 0, STR: 0, INT: 0, DEX: 0, SPD: 0, Tough: 0, Weak: 0 }
  const dataTable = rawBasicAttrs.DataTable || []
  const matchedEntries = []

  searchNames.forEach(name => {
    const entry = dataTable.find(item => item.Name === name)
    if (entry) {
      matchedEntries.push(entry)
      sums.CONS += (entry.InitialCONS || 0)
      sums.STR += (entry.InitialSTR || 0)
      sums.INT += (entry.InitialINT || 0)
      sums.DEX += (entry.InitialDEX || 0)
      sums.SPD += (entry.initialSPD || 0)
      sums.Tough += (entry.initialTough || 0)
      sums.Weak += (entry.initialWeak || 0)
    }
  })

  const level = Math.max(1, Math.min(100, Number(char.level) || 1))
  const nameToKey = { '生命': 'CONS', '力量': 'STR', '精神': 'INT', '敏捷': 'DEX', '速度': 'SPD', '韧性': 'Tough', '弱点': 'Weak' }

  for (let L = 2; L <= level; L++) {
    const remainder = L % 10
    const growthSlot = remainder === 0 ? 10 : remainder
    const growthKey = `GrowthType${growthSlot}`
    matchedEntries.forEach(entry => {
      const attrName = entry[growthKey]
      if (attrName && nameToKey[attrName]) sums[nameToKey[attrName]] += 1
    })
  }

  const isMage = char.class === '法师'
  let charStartingMana = isMage ? 10 : 0
  let charMaxMana = 30
  const equipSums = { CONS: 0, STR: 0, INT: 0, DEX: 0, SPD: 0, Tough: 0, Luck: 0, InitialMagic: 0 }

  Object.values(char.equips).forEach(eq => {
    if (eq) {
      const star = eq.star || 0
      equipSums.CONS += getAttrVal(eq, 'CONS', star)
      equipSums.STR += getAttrVal(eq, 'STR', star)
      equipSums.INT += getAttrVal(eq, 'INT', star)
      equipSums.DEX += getAttrVal(eq, 'DEX', star)
      equipSums.SPD += getAttrVal(eq, 'SPD', star)
      equipSums.Tough += getAttrVal(eq, 'Tough', star)
      equipSums.Luck += getAttrVal(eq, 'Luck', star)
      equipSums.InitialMagic += getAttrVal(eq, 'InitialMagic', star)
    }
  })

  // ====== 新增：解析词条带来的额外属性加成 ======
  const bondSums = { CONS: 0, STR: 0, INT: 0, DEX: 0, SPD: 0, Tough: 0, Luck: 0, InitialMagic: 0 }
  const activeBonds = characterBondSummary.value

  if (activeBonds && activeBonds.length > 0) {
    // 正则表达式：匹配 "最大生命+10"、"幸运+6" 等文本，(?!%) 确保不会错误匹配到 "+10%" 这种百分比加成
    const attrRegex = /(?:最大)?(力量|精神|敏捷|生命|速度|幸运|韧性|初始魔力)(?:值)?\s*\+\s*(\d+)(?!%)/g
    const cnToKey = {
      '力量': 'STR', '精神': 'INT', '敏捷': 'DEX', '生命': 'CONS',
      '速度': 'SPD', '幸运': 'Luck', '韧性': 'Tough', '初始魔力': 'InitialMagic'
    }

    activeBonds.forEach(bond => {
      // 找到该词条目前激活的最高等级文本
      if (bond.unlockedIdx >= 0 && bond.rows && bond.rows[bond.unlockedIdx]) {
        const activeEffect = bond.rows[bond.unlockedIdx].effect
        let match
        // 循环匹配字符串里所有符合格式的属性加成
        while ((match = attrRegex.exec(activeEffect)) !== null) {
          const attrName = match[1]
          const attrValue = parseInt(match[2], 10)
          const key = cnToKey[attrName]
          if (key) {
            bondSums[key] += attrValue
          }
        }
      }
    })
  }
  // ===============================================

  // 结算总初始魔力 (自带 + 装备基础 + 词条)
  const finalStartingMana = charStartingMana + equipSums.InitialMagic + bondSums.InitialMagic
  const finalManaText = `${finalStartingMana}/${charMaxMana}`

  // 最终的面板统计展示 = 基础成长值(sums) + 装备自带固定属性(equipSums) + 词条提取的属性(bondSums)
  return [
    { key: 'CONS', name: '生命', icon: 'mid_ico_attribute_0003.png', value: sums.CONS + equipSums.CONS + bondSums.CONS },
    { key: 'InitialMagic', name: '初始魔力', icon: 'mid_ico_attribute_0006.png', value: finalManaText },
    { key: 'Tough', name: '韧性', icon: 'mid_ico_attribute_0009.png', value: sums.Tough + equipSums.Tough + bondSums.Tough },
    { key: 'SPD', name: '速度', icon: 'mid_ico_attribute_0001.png', value: sums.SPD + equipSums.SPD + bondSums.SPD },
    { key: 'STR', name: '力量', icon: 'mid_ico_attribute_0004.png', value: sums.STR + equipSums.STR + bondSums.STR },
    { key: 'INT', name: '精神', icon: 'mid_ico_attribute_0002.png', value: sums.INT + equipSums.INT + bondSums.INT },
    { key: 'DEX', name: '敏捷', icon: 'mid_ico_attribute_0005.png', value: sums.DEX + equipSums.DEX + bondSums.DEX },
    { key: 'Luck', name: '幸运', icon: 'mid_ico_attribute_0010.png', value: equipSums.Luck + bondSums.Luck }
  ]
})

const handleRoleIconError = (e) => { e.target.src = '/General/7.png' }
const handleDrawError = (e) => { e.target.src = '/logo.png' }
const handleEquipIconError = (e) => { e.target.src = '/General/6.png' }
const handleSkillIconFallback = (e) => { e.target.src = '/Skill/TB00001.png' }
</script>

<style scoped>
.battle-sim-container {
  padding: 15px;
  display: flex;
  flex-direction: column;
  /* 新增：模仿新页面的设计，限制最大高度，隐藏外部滚动条 */
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.battle-sim-header {
  margin-bottom: 20px;
  text-align: center;
}

.battle-sim-header .title {
  font-size: 20px;
  color: var(--text-main, #cf7155);
  font-weight: 700;
  margin: 0;
}

.arena-stage {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden; /* 新增：强制隐藏底部横向滚动条 */
  min-height: 0;
  padding-right: 8px; /* 稍微加大一点，防止最右侧红色删除按钮被切边 */
  box-sizing: border-box; /* 新增：把内边距算进 100% 宽度里，防止撑破容器 */
}

.arena-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  width: 100%;
}

.team-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.team-side-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub, #64748b);
  margin-bottom: 12px;
}

.vs-divider {
  width: 100%;
  height: 100%;
}

.slots-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 140px;
}

.arena-slot {
  height: 100%;
  flex: 1 1 0%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  aspect-ratio: 0.75;
}

.empty-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-sub);
  width: 100%;
  height: 100%;
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  background: var(--card-bg, #ffffff);
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.empty-slot:hover {
  border-color: var(--primary);
  background: var(--dropdown-hover);
}

.empty-slot .plus-icon {
  font-size: 20px;
  font-weight: bold;
  line-height: 1;
}

.empty-slot .empty-text {
  font-size: 11px;
  margin-top: 4px;
}

.character-card-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 4px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  transition: background 0.2s ease;
  position: relative;
}

.character-card-wrapper:hover {
  background: var(--bg-hover, #f1f5f9);
}

.float-animation {
  animation: floatUpDown 4s ease-in-out infinite;
}

@keyframes floatUpDown {
  0% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
  100% { transform: translateY(0); }
}

.character-card-wrapper .avatar-box {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.character-card-wrapper .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scale(1.3);
}

.character-card-wrapper .avatar-img.mirrored {
  transform: scaleX(-1) scale(1.3);
}

.slot-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 4px;
  width: 100%;
}

.slot-name {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  width: 100%;
}

.slot-lv {
  font-size: 10px;
  align-self: center;
  background: var(--bg-hover, #e2e8f0);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: bold;
  color: var(--text-sub);
}

.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ef4444;
  color: #ffffff;
  border: none;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
  z-index: 10;
}

.arena-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.config-side-btn {
  height: 32px;
  padding: 0 24px;
  border-radius: 999px;
  background: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.config-side-btn.left {
  border: 1px solid #3b82f6;
  color: #3b82f6;
}

.config-side-btn.right {
  border: 1px solid #f97316;
  color: #f97316;
}

.config-side-btn:hover {
  background: var(--bg-hover, #f1f5f9);
  opacity: 0.8;
}

.start-battle-btn {
  height: 36px;
  padding: 0 32px;
  border-radius: 999px;
  background: transparent;
  color: var(--text-main, #cf7155);
  font-weight: 700;
  font-size: 20px;
  border: 1px solid var(--border-color);
  cursor: pointer;
}

.start-battle-btn:hover { opacity: 0.8; }

.battle-log-container {
  margin-top: 24px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  width: 100%;
  box-sizing: border-box;
  height: 350px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.log-header {
  padding: 10px 14px;
  background: #f8fafc;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub, #64748b);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  border-radius: 12px 12px 0 0;
}

.log-content {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  overflow-y: scroll;
  overflow-x: hidden;
  word-break: break-all;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: monospace, sans-serif;
  font-size: 13px;
  scroll-behavior: smooth;
}

.log-item { line-height: 1.5; }
.log-empty { color: #cbd5e1; text-align: center; margin-top: 40px; font-size: 13px; }
.log-time { color: #94a3b8; margin-right: 8px; font-size: 12px; }
.log-text.sys { color: #64748b; font-weight: bold;}
.log-text.info { color: #3b82f6; }
.log-text.success { color: #10b981; }
.log-text.warn { color: #f97316; }

/* Modal general */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1800;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.modal-card {
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  max-height: 95vh;
  box-sizing: border-box;
  overflow: hidden;
  width: 100%;
}

.modal-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-hover);
}

.modal-header h3 {
  margin: 0;
  font-size: 15px;
  color: var(--text-main);
  font-weight: 700;
}

.modal-header .close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-sub);
  cursor: pointer;
  padding: 4px;
}

/* Detail Modal */
.detail-modal-card { max-width: 660px; }
.detail-modal-body {
  padding: 24px 16px 16px 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 新增：内容区域开启内部自动滚动 */
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* 顶部栏：相对定位容器 */
.detail-top-bar {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 10px;
  gap: 12px;
}

.detail-char-name {
  font-size: 18px;
  font-weight: 800;
  margin: 0;
  white-space: nowrap;
  flex-shrink: 0;
  z-index: 1;
}

/* 星星：绝对定位 严格水平居中 */
.star-display-list {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 4px;
}

.star-image {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.star-grey {
  filter: grayscale(1) opacity(0.25);
}

/* 切换按钮：紧贴星星右侧 */
.star-action-btn {
  position: absolute;
  left: calc(50% + 58px);
  top: 50%;
  transform: translateY(-50%);
  height: 24px !important;
  padding: 0 10px !important;
  font-size: 11px !important;
  border-radius: 4px !important;
  font-weight: 700 !important;
  z-index: 1;
}

.level-selector-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  z-index: 1;
}

.level-selector-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-sub, #64748b);
}

.level-input-wrapper-horizontal {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg);
  padding: 0 4px;
  height: 24px;
}

.level-number-input-horizontal {
  width: 32px;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  outline: none;
}

.level-number-input-horizontal::-webkit-outer-spin-button,
.level-number-input-horizontal::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.level-adjust-btn-horizontal {
  font-size: 9px;
  color: var(--text-sub, #64748b);
  cursor: pointer;
  padding: 0 6px;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  transition: color 0.15s ease;
}

.level-adjust-btn-horizontal:hover { color: var(--primary); }

/* 核心网格布局 */
.detail-core-layout {
  display: grid;
  grid-template-columns: 140px 1fr 140px;
  gap: 12px;
  align-items: stretch;
}

.equip-slots-column {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
}

.equip-slot-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px;
  background: var(--bg-hover, #f8fafc);
  cursor: pointer;
  transition: all 0.15s ease;
  flex: 1;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
}

.equip-slot-item:hover {
  border-color: var(--primary);
  background: var(--card-bg);
}

.equip-slot-item.is-inherited {
  background-image: repeating-linear-gradient(
    45deg,
    rgba(239, 68, 68, 0.08),
    rgba(239, 68, 68, 0.08) 8px,
    rgba(239, 68, 68, 0.16) 8px,
    rgba(239, 68, 68, 0.16) 16px
  ) !important;
  border-color: rgba(239, 68, 68, 0.5) !important;
}

.equip-slot-item .slot-label {
  font-size: 12px;
  font-weight: bold;
  color: var(--text-sub);
  margin-bottom: 2px;
  display: block;
}

.equip-slot-item .slot-content {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.equip-slot-item .slot-placeholder {
  font-size: 11px;
  color: #cbd5e1;
}

.equip-slot-item .equip-icon {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
  object-fit: cover;
}

.equip-slot-item .equip-name {
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.equip-clear-btn {
  background: none;
  border: none;
  font-size: 9px;
  color: #ef4444;
  cursor: pointer;
  padding: 2px;
  position: absolute;
  right: -2px;
  top: -12px;
  opacity: 0.6;
}

.equip-clear-btn:hover { opacity: 1; }

/* 中间立绘栏 */
.center-portrait-column {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.center-portrait-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  background: var(--bg);
  min-height: 200px;
  max-height: 280px;
  aspect-ratio: 1;
  margin: 0 auto;
  width: 100%;
  position: relative;
}

.big-portrait-img {
  width: 95%;
  height: 95%;
  object-fit: contain;
}

/* 技能预览悬浮卡 */
.skill-preview-floating-bottom {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  background: #ffffff;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 8px;
  padding: 8px 12px;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  text-align: left;
  z-index: 30;
}

.preview-title-bar-light {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 4px;
}

.preview-name-light {
  font-size: 14px;
  font-weight: bold;
  color: #cf7155;
}

.preview-close-x-light {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  padding: 0 2px;
}

.preview-close-x-light:hover { color: #1e293b; }

.preview-desc-body-light {
  font-size: 13px;
  line-height: 1.4;
  color: #334155;
  word-break: break-all;
  max-height: 60px;
  overflow-y: auto;
}

/* 底部 6 格技能 */
.center-bottom-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  height: 50px;
  box-sizing: border-box;
}

.bottom-feature-box {
  width: 100%;
  height: 50px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: #ffffff;
  box-sizing: border-box;
  display: flex;
  align-items: center;     /* 新增：垂直居中 */
  justify-content: center; /* 新增：水平居中 */
  position: relative;
  cursor: pointer;
  overflow: visible;
  transition: border-color 0.15s ease;
}

.bottom-feature-box:hover { border-color: #cf7155; }
.bottom-feature-box.feature-active {
  border-color: #cf7155;
  box-shadow: 0 0 0 1px #cf7155;
}

/* 找到并修改 .feature-full-icon */
.feature-full-icon {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 修改：将 cover 改为 contain，保证图片完整显示不被裁切 */
  border-radius: 5px;
}

.feature-label-text-absolute {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(100deg, rgba(63,63,70,0.85) 0%, rgba(39,39,42,0.85) 100%);
  color: #fef08a;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1px;
  white-space: nowrap;
  padding: 1px 1px;
  z-index: 10;
  border-radius: 6px;
  border: 1px solid rgba(82, 82, 91, 0.7);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.feature-locked .feature-full-icon {
  filter: grayscale(1) brightness(0.6) opacity(0.5);
}

.feature-locked .feature-label-text-absolute {
  color: #64748b;
}

.lock-mask-text {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 5px;
  color: #ffffff;
  font-size: 8px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  transform: scale(0.95);
}

.dynamic-attributes-box {
  border-top: 1px dashed var(--border-color);
  padding-top: 14px;
}

.dynamic-attributes-box .box-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 800;
  color: var(--text-main);
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.attribute-item-card {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 8px;
  box-sizing: border-box;
}

/* 词条总览样式 */
.bond-summary-box {
  border-top: 1px dashed var(--border-color);
  padding-top: 14px;
}

.bond-summary-box .box-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 800;
  color: var(--text-main);
}

.bond-summary-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bond-summary-item {
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bs-name {
  font-size: 13px;
  font-weight: 800;
}

.bs-type-tag {
  font-size: 10px;
  color: var(--text-sub);
  background: var(--border-color);
  padding: 1px 5px;
  border-radius: 4px;
}

.bs-thresholds {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bs-thresh-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
}

.bs-thresh-row.unlocked {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1e3a8a;
  font-weight: 600;
}

.dark-mode .bs-thresh-row.unlocked {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
}

.bs-thresh-row.locked {
  color: var(--text-sub, #64748b);
  border-color: var(--border-color);
  opacity: 0.7;
}

.bs-thresh-num {
  font-weight: bold;
  flex-shrink: 0;
}

.bs-thresh-effect {
  word-break: break-all;
}


.attribute-item-card .attr-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.attribute-item-card .attr-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.attribute-item-card .attr-name {
  font-size: 10px;
  color: var(--text-sub, #64748b);
  line-height: 1.1;
}

.attribute-item-card .attr-val {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-main);
}

/* Picker Modal */
.picker-modal-card {
  max-width: 460px;
  height: 80vh;
}

.picker-search-row {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
}

.search-box-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-hover, #f1f5f9);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
}

.search-box-wrapper .search-icon {
  width: 14px;
  height: 14px;
}

.search-box-wrapper .search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: var(--text-main);
  flex: 1;
}

.picker-list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.picker-char-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.picker-char-card:hover { background: var(--bg-hover); }

.picker-avatar-box {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.picker-avatar {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.picker-name {
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  line-height: 1.2;
  word-break: break-all;
}

.no-data-hint {
  text-align: center;
  padding: 40px 0;
  font-size: 13px;
  color: var(--text-sub);
}

/* Equipment Picker */
.picker-equip-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker-equip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  background: var(--card-bg);
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.picker-equip-row:hover {
  border-color: var(--primary);
  background: var(--bg-hover);
}

.equip-row-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.equip-row-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.equip-row-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.equip-row-name {
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.equip-row-step {
  font-size: 10px;
  color: var(--text-sub);
}

.equip-row-attrs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.equip-stat-tag {
  font-size: 9.5px;
  background: var(--bg-hover, #f1f5f9);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1px 4px;
  color: var(--text-main);
  white-space: nowrap;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-fade-enter-active { transition: all 0.2s ease; }
.slide-fade-leave-active { transition: all 0.15s ease; }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; transform: translateY(-6px); }


img.game-sprite {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

@media (max-width: 600px) {
  .battle-sim-container { padding: 10px; }
  .arena-grid { grid-template-columns: minmax(0, 1fr) 20px minmax(0, 1fr) !important; gap: 4px !important; }
  .slots-container { gap: 2px !important; height: 100px !important; }
  .character-card-wrapper { padding: 2px !important; gap: 4px !important; }
  .character-card-wrapper .avatar-box { width: 38px !important; height: 38px !important; }
  .slot-info { gap: 2px !important; }
  .slot-name { font-size: 10px !important; transform: scale(0.95); }
  .slot-lv { font-size: 8px !important; padding: 1px 4px !important; }
  .empty-slot .plus-icon { font-size: 14px !important; }
  .empty-slot .empty-text { font-size: 9px !important; margin-top: 1px !important; }
  .config-side-btn { padding: 0 12px !important; font-size: 12px !important; }
  .start-battle-btn { padding: 0 16px !important; font-size: 12px !important; height: 32px !important;}
  .battle-log-container { height: 280px !important; }

  .detail-name-star-row { flex-direction: column; align-items: center; gap: 4px; }
  .star-image { width: 14px; height: 14px; }
  .star-action-btn { left: calc(50% + 46px) !important; }
  .detail-core-layout { grid-template-columns: 85px 1fr 85px !important; gap: 8px !important; }
  .equip-slots-column { gap: 6px !important; }
  .equip-slot-item { height: auto !important; min-height: 42px !important; padding: 4px !important; }
  .equip-slot-item .slot-label { font-size: 8px !important; margin-bottom: 0px !important; }
  .equip-slot-item .slot-placeholder { font-size: 9px !important; }
  .equip-slot-item .equip-icon { width: 18px !important; height: 18px !important; }
  .equip-slot-item .equip-name { font-size: 9px !important; line-height: 1.1 !important; }
  .equip-clear-btn { top: -10px !important; font-size: 8px !important; }

  .center-portrait-card { min-height: 120px !important; }
  .center-bottom-grid { height: 42px !important; gap: 4px !important; }
  .bottom-feature-box { height: 42px !important; }
  .feature-label-text-absolute { bottom: -5px !important; font-size: 9px !important; }
  .lock-mask-text { font-size: 7px !important; }
  .skill-preview-floating-bottom { bottom: 4px !important; left: 4px !important; right: 4px !important; padding: 6px !important; }

  .attributes-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 4px !important; }
  .attribute-item-card { padding: 4px 6px !important; gap: 4px !important; border-radius: 6px !important; }
  .attribute-item-card .attr-icon { width: 12px !important; height: 12px !important; }
  .attribute-item-card .attr-name { font-size: 8px !important; transform: scale(0.95); }
  .attribute-item-card .attr-val { font-size: 10px !important; }
}

/* ===== 装备选择模态框与详细面板适配 (EquipView 同款) ===== */
.equip-picker-modal-card {
  max-width: 500px !important;
  height: 85vh;
}

.equip-sticky-top {
  flex-shrink: 0;
  background: var(--card-bg);
  padding: 10px 16px 8px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  max-height: 72vh;
}

.equip-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.search-icon {
  width: 18px;
  height: 18px;
  filter: var(--icon-filter);
  margin-right: 10px;
  opacity: 0.7;
  flex-shrink: 0;
}

.equip-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 10px;
  flex: 1;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
  min-width: 0;
}

.equip-search-box:focus-within {
  border-color: #409eff;
}

.equip-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-main);
  min-width: 0;
  font-family: inherit;
}

.sub-filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  transition: all 0.2s ease;
  flex-shrink: 0;
  color: var(--text-main) !important;
  height: 38px;
}

.sub-filter-btn:hover {
  border-color: var(--primary);
  color: var(--primary) !important;
}

.sub-filter-btn.active {
  border-color: var(--primary);
  color: var(--primary) !important;
}

.sub-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 14px;
  margin-top: 8px;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
}

.sub-search-box:focus-within {
  border-color: var(--primary);
}

.sub-search-icon {
  width: 16px;
  height: 16px;
  filter: var(--icon-filter);
  margin-right: 8px;
  opacity: 0.7;
  flex-shrink: 0;
}

.sub-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-main);
  font-family: inherit;
}

.sorting-section {
  margin-top: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.sorting-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub);
}

/* 当前检索数量栏 */
.search-count-bar {
  padding: 6px 12px 2px 12px;
  font-size: 12px;
  color: var(--text-main);
  text-align: left;
  font-weight: 600;
  display: flex;
  align-items: center;
  margin-top: 4px;
}

.count-highlight {
  color: var(--primary);
  font-weight: 800;
  margin: 0 4px;
}

.filter-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  transition: all 0.2s ease;
  flex-shrink: 0;
  color: var(--text-main) !important;
  height: 32px;
}

.filter-toggle-btn:hover {
  border-color: var(--primary);
  color: var(--primary) !important;
}

.collapse-icon {
  width: 12px;
  height: 12px;
  filter: var(--icon-filter);
  transition: transform 0.25s ease;
}

.collapse-icon.collapsed {
  transform: rotate(180deg);
}

.filter-toggle-text {
  font-size: 12px;
  font-weight: 600 !important;
  color: var(--text-main) !important;
}

.filter-panel {
  margin-top: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-sub);
  width: 48px;
  flex-shrink: 0;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.tag {
  padding: 3px 8px;
  background: var(--bg);
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  border: 1px solid var(--border-color);
  color: var(--text-main);
  transition: all 0.15s ease;
  user-select: none;
}

.tag:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.tag.active {
  background: #dbeafe;
  color: var(--primary);
  border-color: var(--primary);
}

.grid-5-cols {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.effect-filter-bar {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 12px;
  background: var(--card-bg);
  margin-top: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.03);
}

.effect-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.effect-filter-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-sub);
}

.effect-toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.effect-toggle-text {
  font-size: 12px;
  color: var(--text-main);
  font-weight: 500;
}

.categorized-effect-tags {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-group-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag-group-header {
  font-size: 11px;
  font-weight: 800;
  color: var(--text-sub);
  display: flex;
  align-items: center;
  gap: 4px;
}

.tag-group-header::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 10px;
  background: var(--text-sub);
  border-radius: 1px;
}

.effect-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.effect-tag {
  font-size: 10.5px;
  padding: 3px 6px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.effect-tag.active {
  background: rgba(249, 115, 22, 0.1) !important;
  border-color: var(--primary) !important;
  color: var(--primary) !important;
  font-weight: 600;
}

.tag-close-x {
  font-size: 8px;
  margin-left: 2px;
}

/* Detailed List Layout */
.equip-list-container {
  padding: 10px 16px;
  overflow-y: auto;
  flex: 1;
}

.equip-detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.equip-detail-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  cursor: pointer;
}

.equip-detail-card:hover {
  border-color: var(--primary);
}

.detail-row-first {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-card-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.equip-detail-icon-slot {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.equip-detail-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.equip-detail-name {
  font-size: 13px;
  font-weight: 800;
}

.detail-card-right-side {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-triangle-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.triangle-icon {
  width: 14px;
  height: 14px;
  filter: brightness(0) saturate(100%); /* Force pure black */
  transition: transform 0.2s ease, opacity 0.2s ease;
  opacity: 0.6;
}

.expand-triangle-btn:hover .triangle-icon {
  opacity: 1;
}

.triangle-icon.collapsed {
  transform: rotate(180deg);
}

.detail-card-attributes {
  display: flex;
  gap: 4px;
}

.base-attr-tag {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--bg-hover, #f1f5f9);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-main);
}

.attr-mini-icon {
  width: 10px;
  height: 10px;
}

.collapsible-bonds-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px dashed var(--border-color);
  padding-top: 6px;
  margin-top: 2px;
}

.detail-row-bond {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bond-meta-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bond-title-text {
  font-size: 12px;
  font-weight: 700;
}

.bond-type-tag {
  font-size: 9px;
  color: var(--text-sub);
  background: var(--border-color);
  padding: 0 3px;
  border-radius: 3px;
}

.bond-desc-line {
  font-size: 11.5px;
  color: var(--text-main);
  line-height: 1.4;
}



/* ===== 装备详情弹窗 (EquipView 同款) ===== */
.equip-detail-window {
  background: var(--card-bg);
  width: 95%;
  max-width: 360px;
  border-radius: 20px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  z-index: 2100;
}

@media (min-width: 601px) {
  .equip-detail-window {
    max-width: 480px !important;
  }
}

.equip-modal-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  min-height: 24px;
}

.centered-modal-title {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  text-align: center;
  pointer-events: none;
}

.relic-modal-close {
  background: transparent;
  border: none;
  font-size: 16px;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.15s;
  z-index: 2;
  margin-left: auto;
}

.relic-modal-close:hover {
  color: #ef4444;
}

.equip-modal-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 70vh;
  overflow-y: auto;
}

.modal-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px;
  box-sizing: border-box;
}

.modal-stars-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 90px;
}

.star-row {
  display: flex;
  gap: 3px;
}

.modal-star-tag {
  flex: 1;
  padding: 2px 0;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  color: var(--text-sub);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
}

.modal-star-tag.active {
  background: #dbeafe;
  color: var(--primary);
  border-color: var(--primary);
}

.modal-star-tag.inherit-tag.active {
  background: #dcfce7;
  color: #16a34a;
  border-color: #16a34a;
}

.modal-icon-center {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
}

.relic-detail-img {
  width: 90%;
  height: 90%;
  object-fit: contain;
}

.modal-tags-right {
  display: grid;
  grid-template-columns: repeat(2, 42px);
  grid-template-rows: repeat(2, 20px);
  gap: 4px;
  width: 88px;
}

.modal-info-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 9.5px;
  font-weight: 700;
  border-radius: 4px;
}

.modal-info-tag.type-tag {
  background: rgba(100, 116, 139, 0.08);
  color: #64748b;
  border: 1px solid rgba(100, 116, 139, 0.15);
}

.modal-info-tag.class-tag {
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.modal-description-row {
  font-size: 11px;
  color: var(--text-main);
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
  line-height: 1.3;
  text-align: center;
}

.modal-attributes-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.attribute-cell-box {
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 2px;
}

.attr-grid-icon {
  width: 11px;
  height: 11px;
}

.attr-grid-val {
  font-size: 10px;
  font-weight: 800;
}

.modal-bonds-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bond-detail-item-box {
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bond-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.bond-item-name {
  font-size: 12px;
  font-weight: 800;
}

.bond-item-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bond-item-type {
  font-size: 10px;
  color: var(--text-sub);
  font-weight: 600;
}

.bond-collapse-icon {
  width: 10px;
  height: 10px;
  transition: transform 0.2s ease;
}

.bond-collapse-icon.collapsed {
  transform: rotate(180deg);
}

.bond-item-basic-desc {
  font-size: 11.5px;
  color: var(--text-main);
  line-height: 1.3;
}

.bond-expanded-list {
  margin-top: 4px;
  border-top: 1px dashed var(--border-color);
  padding-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.expanded-row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 4px;
  border-bottom: 1px dashed var(--border-color);
  font-size: 11.5px;
  line-height: 1.3;
  color: var(--text-main);
}

.expanded-row:last-child {
  border-bottom: none;
}

.expanded-row.active {
  background: rgba(59, 130, 246, 0.08);
  color: var(--primary);
  font-weight: 700;
  border: 1px solid rgba(59, 130, 246, 0.12);
}

.row-num {
  font-weight: 700;
  flex-shrink: 0;
}

.row-effect {
  flex: 1;
}

.modal-source-section {
  display: flex;
  align-items: center;
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 11.5px;
}

.source-header-label {
  font-weight: 800;
  color: var(--text-sub);
}

.source-content-text {
  color: var(--text-main);
  font-weight: 700;
}

/* ===== 装备详情槽位配置中的星级与传承按钮 ===== */
.equip-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.equip-stars-overlay {
  position: absolute;
  left: 50%;
  bottom: 1px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  background: rgba(0, 0, 0, 0.4);
  padding: 1px 2px;
  border-radius: 3px;
  pointer-events: none;
}

.equip-star-icon {
  width: 10px;
  height: 10px;
  object-fit: contain;
}

.equip-controls-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
  width: 100%;
}

.star-row-line {
  display: flex;
  justify-content: center;
  gap: 3px;
  width: 100%;
}

.modal-star-tag.mini-tag {
  padding: 1px 4px !important;
  font-size: 9.5px !important;
  border-radius: 3px !important;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  text-align: center;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}

.modal-star-tag.mini-tag.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 600px) {
  .equip-controls-row {
    gap: 2px;
    margin-top: 2px;
  }
  .modal-star-tag.mini-tag {
    padding: 0px 2px !important;
    font-size: 8px !important;
    border-radius: 2px !important;
  }
}
/* 新增：角色详情全屏页面布局 */
.full-page-detail-container {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  /* 新增：包裹层锁死高度 */
  min-height: 0;
  overflow: hidden;
}

.detail-modal-card.full-page-mode {
  max-width: 100%;
  height: 100%;
  border: 1px solid var(--border-color);
  box-shadow: none;
  max-height: none;
  /* 新增：确保卡片占据完整高度并开启flex布局 */
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>

<style>
/* 避免滚动条出现时挤压页面导致页面宽度缩小抖动 */
html {
  scrollbar-gutter: stable;
}
</style>
 
