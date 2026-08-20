<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <!-- 搜索栏与次级筛选 -->
      <div class="talent-search-row">
        <div class="talent-search-box">
          <img src="/ui/search.svg" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索关键词(综合名字、描述、词条、类型等)..."
            class="talent-search-input"
          />
        </div>
        <button class="sub-filter-btn" :class="{ active: showSubSearch }" @click="showSubSearch = !showSubSearch">
          <span class="filter-toggle-text">次筛</span>
          <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !showSubSearch }" />
        </button>
      </div>

      <!-- 二次筛选输入框 -->
      <Transition name="slide-fade">
        <div v-show="showSubSearch" class="sub-search-box">
          <img src="/ui/search.svg" class="sub-search-icon" />
          <input
            type="text"
            v-model="subSearchQuery"
            placeholder="结果内二次筛选..."
            class="sub-search-input"
          />
        </div>
      </Transition>


      <!-- 类型分段切换 Tab 按键 -->
      <div class="tabs-section flex-col-layout" style="margin-top: 8px;">
        <div class="tabs-group">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab-btn', { active: activeTab === tab.id }]"
            @click="switchTab(tab.id)"
          >
            {{ tab.name }}
          </button>
        </div>
      </div>

      <!-- 效果标签折叠栏（仅在对应分类激活时在下方显示） -->
      
      <!-- 1. 支援技能星级筛选 -->
      <div v-show="activeTab === 'subskill'" class="sorting-section" style="margin-top: 8px;">
        <span class="sorting-label">星级筛选：</span>
        <div class="sorting-group">
          <button
            v-for="star in [3, 4, 5]"
            :key="star"
            :class="['sort-btn', { active: selectedSubSkillStar === star }]"
            @click="toggleSubSkillStarFilter(star)"
          >
            {{ star }}星
          </button>
        </div>
      </div>

      <!-- 1. 支援技能 Tag 筛选栏 -->
      <div v-show="activeTab === 'subskill'" class="effect-filter-bar animate-fade-in" style="margin-top: 8px;">
        <div class="effect-filter-header" @click="subskillTagsExpanded = !subskillTagsExpanded">
          <span class="effect-filter-title">查找效果：</span>
          <div class="effect-expand-trigger">
            <span class="expand-text-hint">{{ subskillTagsExpanded ? '点击折叠' : '点击展开' }}</span>
            <img src="/ui/up.svg" class="arrow-indicator" :class="{ rotated: !subskillTagsExpanded }" />
          </div>
        </div>
        <div v-show="subskillTagsExpanded" class="effect-tags-content animate-fade-in categorized-effect-tags">
          <div v-for="(group, idx) in categorizedSubSkillTags" :key="group.name" class="tag-group-container">
            <div class="tag-group-header">
              <span class="group-title">{{ group.name }}</span>
            </div>
            <div class="effect-tags-list">
              <span
                v-for="tag in group.tags"
                :key="tag"
                :class="['effect-tag', { active: isSubSkillTagActive(tag) }]"
                @click="toggleSubSkillTag(tag)"
              >
                {{ formatTagText(tag) }}
                <span v-if="isSubSkillTagActive(tag)" class="tag-close-x">✕</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 主动技能 Tag 筛选栏 -->
      <div v-show="activeTab === 'unique'" class="effect-filter-bar animate-fade-in" style="margin-top: 8px;">
        <div class="effect-filter-header" @click="uniqueTagsExpanded = !uniqueTagsExpanded">
          <span class="effect-filter-title">查找效果</span>
          <div class="effect-expand-trigger">
            <span class="expand-text-hint">{{ uniqueTagsExpanded ? '点击折叠' : '点击展开' }}</span>
            <img src="/ui/up.svg" class="arrow-indicator" :class="{ rotated: !uniqueTagsExpanded }" />
          </div>
        </div>
        <div v-show="uniqueTagsExpanded" class="effect-tags-content animate-fade-in categorized-effect-tags">
          <div v-for="(group, idx) in categorizedUniqueTags" :key="group.name" class="tag-group-container">
            <div class="tag-group-header">
              <span class="group-title">{{ group.name }}</span>
            </div>
            <div class="effect-tags-list">
              <span
                v-for="tag in group.tags"
                :key="tag"
                :class="['effect-tag', { active: isUniqueTagActive(tag) }]"
                @click="toggleUniqueTag(tag)"
              >
                {{ formatTagText(tag) }}
                <span v-if="isUniqueTagActive(tag)" class="tag-close-x">✕</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 装备 Tag 筛选栏 -->
      <div v-show="activeTab === 'equip'" class="effect-filter-bar animate-fade-in" style="margin-top: 8px;">
        <div class="effect-filter-header" @click="equipTagsExpanded = !equipTagsExpanded">
          <span class="effect-filter-title">查找效果</span>
          <div class="effect-expand-trigger">
            <span class="expand-text-hint">{{ equipTagsExpanded ? '点击折叠' : '点击展开' }}</span>
            <img src="/ui/up.svg" class="arrow-indicator" :class="{ rotated: !equipTagsExpanded }" />
          </div>
        </div>
        <div v-show="equipTagsExpanded" class="effect-tags-content animate-fade-in categorized-effect-tags">
          <div v-for="(group, idx) in categorizedEquipTags" :key="group.name" class="tag-group-container">
            <div class="tag-group-header">
              <span class="group-title">{{ group.name }}</span>
            </div>
            <div class="effect-tags-list">
              <span
                v-for="tag in group.tags"
                :key="tag"
                :class="['effect-tag', { active: isEquipTagActive(tag) }]"
                @click="toggleEquipTag(tag)"
              >
                {{ formatTagText(tag) }}
                <span v-if="isEquipTagActive(tag)" class="tag-close-x">✕</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 结果展示列表区 -->
    <div class="block-list-scroll" ref="listContainer" @scroll="handleScroll">
      <!-- 结果数量统计 -->
      <div :class="['search-count-bar', { 'all-tab': activeTab === 'all' }]" style="margin-top: 6px; margin-bottom: 6px;">
        <template v-if="activeTab === 'all'">
          <div>当前检索到<span class="count-highlight">{{ totalFilteredCount }}</span>个数据</div>
          <div style="margin-top: 3px;">天赋：<span class="count-highlight">{{ filteredTalents.length }}</span>，支援：<span class="count-highlight">{{ filteredSubSkills.length }}</span>，技能：<span class="count-highlight">{{ filteredUniques.length }}</span>，装备：<span class="count-highlight">{{ filteredEquips.length }}</span></div>
        </template>
        <template v-else-if="activeTab === 'talent'">
          当前检索天赋数量：<span class="count-highlight">{{ filteredTalents.length }}</span>
        </template>
        <template v-else-if="activeTab === 'subskill'">
          当前检索支援技能数量：<span class="count-highlight">{{ filteredSubSkills.length }}</span>
        </template>
        <template v-else-if="activeTab === 'unique'">
          当前检索技能数量：<span class="count-highlight">{{ filteredUniques.length }}</span>
        </template>
        <template v-else-if="activeTab === 'equip'">
          当前检索装备数量：<span class="count-highlight">{{ filteredEquips.length }}</span>
        </template>
      </div>

      <div v-if="!isDataReady" class="global-loading-state">
        <div class="global-loading-spinner"></div>
        <span>正在加载数据...</span>
      </div>

      <div v-else>
        <!-- 情况 A：未激活具体分类 Tab (展示全部类型区块) -->
        <template v-if="activeTab === 'all'">
        <!-- 1. 天赋区块 -->
        <div v-if="pagedTalents.length > 0" class="section-card">
          <div class="section-header">
            <span class="section-dot" style="background-color: #3b82f6;"></span>
            <h3 class="section-title">天赋 ({{ filteredTalents.length }}项)</h3>
          </div>
          <div class="talent-list">
            <div
              v-for="item in pagedTalents"
              :key="item.uid"
              class="talent-card"
            >
              <div class="talent-top-bar">
                <div v-if="item.标签 === '专属' && item.SpecifyRoleIDs" class="talent-char-avatar-container">
                  <img
                    :src="`/Header/${item.SpecifyRoleIDs}.png`"
                    class="talent-char-avatar-img game-sprite"
                  />
                </div>
                <span class="talent-name" :style="{ color: getTalentStepConfig(item.step).color }">{{ item.name }}</span>
                <div class="talent-tag-dropdown-wrapper">
                  <span
                    class="talent-tag dropdown-trigger-btn"
                    :style="{
                      color: getTalentStepConfig(item.step).color,
                      backgroundColor: getTalentStepConfig(item.step).color + '15'
                    }"
                    @click.stop="toggleTagDropdown(item)"
                  >
                    {{ item.标签 }}
                    <img
                      src="/ui/up.svg"
                      class="tag-arrow-icon"
                      :class="{ 'expanded-flip': !item.dropdownOpen }"
                    />
                  </span>
                  <div v-if="item.dropdownOpen" class="tag-dropdown-menu">
                    <div
                      v-for="(q, qIdx) in item.qualities"
                      :key="q.uid"
                      class="tag-dropdown-item"
                      :style="{ color: getTalentStepConfig(q.step).color }"
                      @click.stop="switchQuality(item, qIdx)"
                    >
                      {{ q.标签 }}
                    </div>
                  </div>
                </div>
                <div class="top-bar-spacer" style="flex: 1;"></div>
                <div class="talent-source-wrapper" @click="openSourceModal(item, 'talent')">
                  <span class="talent-source">{{ item.sourceLabel }}</span>
                  <img src="/ui/expand.svg" class="source-expand-icon" />
                </div>
              </div>
              <div class="talent-effect">{{ item.formattedEffect }}</div>
            </div>
          </div>
        </div>

        <!-- 2. 支援技能区块 -->
        <div v-if="pagedSubSkills.length > 0" class="section-card">
          <div class="section-header">
            <span class="section-dot" style="background-color: #10b981;"></span>
            <h3 class="section-title">支援技能 ({{ filteredSubSkills.length }}项)</h3>
          </div>
          <div class="talent-list">
            <div
              v-for="item in pagedSubSkills"
              :key="item.uid"
              class="talent-card"
            >
              <div class="talent-main-content">
                <div class="talent-details-body">
                  <div class="talent-top-bar">
                    <div class="talent-char-avatar-container">
                      <img :src="`/Header/${item.charId}.png`" class="talent-char-avatar-img game-sprite" />
                    </div>
                    <span class="talent-name" :style="{ color: getTalentStepConfig(item.step).color }">{{ item.name }}</span>
                    <div class="skill-mini-box">
                      <img :src="`/Skill/${item.iconId}.png`" class="skill-mini-img" />
                    </div>
                    <span
                      class="talent-tag"
                      :style="{
                        color: getTalentStepConfig(item.step).color,
                        backgroundColor: getTalentStepConfig(item.step).color + '15'
                      }"
                    >
                      {{ item.标签 }}
                    </span>
                    <div class="top-bar-spacer" style="flex: 1;"></div>
                    <div class="talent-source-wrapper" @click="openSourceModal(item, 'subskill')">
                      <span class="talent-source">{{ item.sourceLabel }}</span>
                      <img src="/ui/expand.svg" class="source-expand-icon" />
                    </div>
                  </div>
                  <div class="talent-effect">{{ item.formattedEffect }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. 主动技能区块 -->
        <div v-if="pagedUniques.length > 0" class="section-card">
          <div class="section-header">
            <span class="section-dot" style="background-color: #f59e0b;"></span>
            <h3 class="section-title">主动技能 ({{ filteredUniques.length }}项)</h3>
          </div>
          <div class="talent-list">
            <div
              v-for="item in pagedUniques"
              :key="item.uid"
              class="talent-card"
            >
              <div class="talent-main-content">
                <div class="talent-details-body">
                  <div class="talent-top-bar">
                    <div class="talent-char-avatar-container">
                      <img :src="`/Header/${item.charId}.png`" class="talent-char-avatar-img game-sprite" />
                    </div>
                    <span class="talent-name" :style="{ color: getTalentStepConfig(item.step).color }">{{ item.name }}</span>
                    <div class="skill-mini-box">
                      <img :src="`/Skill/${item.iconId}.png`" class="skill-mini-img" />
                    </div>
                    <div class="top-bar-spacer" style="flex: 1;"></div>
                    <div class="talent-source-wrapper" @click="openSourceModal(item, 'unique')">
                      <span class="talent-source">{{ item.sourceLabel }}</span>
                      <img src="/ui/expand.svg" class="source-expand-icon" />
                    </div>
                  </div>
                  <div class="talent-effect">{{ item.formattedEffect }}</div>
                  <div class="skill-specs">
                    目标：{{ item.target }} | 目标数：{{ item.maxTarget }} | 释放次数：{{ item.times }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 装备区块 -->
        <div v-if="pagedEquips.length > 0" class="section-card">
          <div class="section-header">
            <span class="section-dot" style="background-color: #ec4899;"></span>
            <h3 class="section-title">装备 ({{ filteredEquips.length }}项)</h3>
          </div>
          <div class="talent-list">
            <div
              v-for="equip in pagedEquips"
              :key="equip.IDs"
              class="equip-detail-card"
              @click="openDetail(equip)"
            >
              <div class="detail-row-first">
                <div class="detail-card-left">
                  <div class="equip-detail-icon-slot" :style="{ backgroundColor: getStepConfig(equip.Step).lightBg }">
                    <img :src="`/Equip/${equip.IDs}.png`" :alt="equip.Name" class="equip-detail-icon game-sprite" />
                  </div>
                  <div class="equip-detail-name" :style="{ color: getStepConfig(equip.Step).color }">
                    {{ equip.Name }}
                    <span v-if="isRareEquip(equip)" class="rare-equip-tag">稀有</span>
                  </div>
                </div>
                <div class="detail-card-attributes">
                  <template v-for="attr in ATTRIBUTE_MAP" :key="attr.key">
                    <div v-if="equip[attr.key] > 0" class="base-attr-tag">
                      <img :src="`/General/${attr.icon}`" class="attr-mini-icon game-sprite" />
                      <span>{{ equip[attr.key] }}</span>
                    </div>
                  </template>
                </div>
              </div>
              <div class="detail-row-bond" v-for="bondKey in ['Pure', 'Title', 'Enhance']" :key="bondKey">
                <template v-if="equip[bondKey]">
                  <div class="bond-meta-line">
                    <span class="bond-title-text" :style="{ color: getBondColor(equip[bondKey]) }">{{ getBondDisplay(equip[bondKey]) }}</span>
                    <span class="bond-type-tag">{{ getBondType(equip[bondKey]) }}</span>
                  </div>
                  <div class="bond-desc-line">{{ getBondDesc(equip[bondKey]) }}</div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 情况 B：激活了具体的 Tab (按 Tab 过滤渲染单网格且支持滚动加载) -->
      <template v-else>
        <!-- 1. 天赋 Tab -->
        <div v-if="activeTab === 'talent'" class="talent-list animate-fade-in">
          <div
            v-for="item in pagedTalents"
            :key="item.uid"
            class="talent-card"
          >
            <div class="talent-top-bar">
              <div v-if="item.标签 === '专属' && item.SpecifyRoleIDs" class="talent-char-avatar-container">
                <img
                  :src="`/Header/${item.SpecifyRoleIDs}.png`"
                  class="talent-char-avatar-img game-sprite"
                />
              </div>
              <span class="talent-name" :style="{ color: getTalentStepConfig(item.step).color }">{{ item.name }}</span>
              <div class="talent-tag-dropdown-wrapper">
                <span
                  class="talent-tag dropdown-trigger-btn"
                  :style="{
                    color: getTalentStepConfig(item.step).color,
                    backgroundColor: getTalentStepConfig(item.step).color + '15'
                  }"
                  @click.stop="toggleTagDropdown(item)"
                >
                  {{ item.标签 }}
                  <img
                    src="/ui/up.svg"
                    class="tag-arrow-icon"
                    :class="{ 'expanded-flip': !item.dropdownOpen }"
                  />
                </span>
                <div v-if="item.dropdownOpen" class="tag-dropdown-menu">
                  <div
                    v-for="(q, qIdx) in item.qualities"
                    :key="q.uid"
                    class="tag-dropdown-item"
                    :style="{ color: getTalentStepConfig(q.step).color }"
                    @click.stop="switchQuality(item, qIdx)"
                  >
                    {{ q.标签 }}
                  </div>
                </div>
              </div>
              <div class="top-bar-spacer" style="flex: 1;"></div>
              <div class="talent-source-wrapper" @click="openSourceModal(item, 'talent')">
                <span class="talent-source">{{ item.sourceLabel }}</span>
                <img src="/ui/expand.svg" class="source-expand-icon" />
              </div>
            </div>
            <div class="talent-effect">{{ item.formattedEffect }}</div>
          </div>
        </div>

        <!-- 2. 支援技能 Tab -->
        <div v-if="activeTab === 'subskill'" class="talent-list animate-fade-in">
          <div
            v-for="item in pagedSubSkills"
            :key="item.uid"
            class="talent-card"
          >
            <div class="talent-main-content">
              <div class="talent-details-body">
                <div class="talent-top-bar">
                  <div class="talent-char-avatar-container">
                    <img :src="`/Header/${item.charId}.png`" class="talent-char-avatar-img game-sprite" />
                  </div>
                  <span class="talent-name" :style="{ color: getTalentStepConfig(item.step).color }">{{ item.name }}</span>
                  <div class="skill-mini-box">
                    <img :src="`/Skill/${item.iconId}.png`" class="skill-mini-img" />
                  </div>
                  <span
                    class="talent-tag"
                    :style="{
                      color: getTalentStepConfig(item.step).color,
                      backgroundColor: getTalentStepConfig(item.step).color + '15'
                    }"
                  >
                    {{ item.标签 }}
                  </span>
                  <div class="top-bar-spacer" style="flex: 1;"></div>
                  <div class="talent-source-wrapper" @click="openSourceModal(item, 'subskill')">
                    <span class="talent-source">{{ item.sourceLabel }}</span>
                    <img src="/ui/expand.svg" class="source-expand-icon" />
                  </div>
                </div>
                <div class="talent-effect">{{ item.formattedEffect }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. 主动技能 Tab -->
        <div v-if="activeTab === 'unique'" class="talent-list animate-fade-in">
          <div
            v-for="item in pagedUniques"
            :key="item.uid"
            class="talent-card"
          >
            <div class="talent-main-content">
              <div class="talent-details-body">
                <div class="talent-top-bar">
                  <div class="talent-char-avatar-container">
                    <img :src="`/Header/${item.charId}.png`" class="talent-char-avatar-img game-sprite" />
                  </div>
                  <span class="talent-name" :style="{ color: getTalentStepConfig(item.step).color }">{{ item.name }}</span>
                  <div class="skill-mini-box">
                    <img :src="`/Skill/${item.iconId}.png`" class="skill-mini-img" />
                  </div>
                  <div class="top-bar-spacer" style="flex: 1;"></div>
                  <div class="talent-source-wrapper" @click="openSourceModal(item, 'unique')">
                    <span class="talent-source">{{ item.sourceLabel }}</span>
                    <img src="/ui/expand.svg" class="source-expand-icon" />
                  </div>
                </div>
                <div class="talent-effect">{{ item.formattedEffect }}</div>
                <div class="skill-specs">
                  目标：{{ item.target }} | 目标数：{{ item.maxTarget }} | 释放次数：{{ item.times }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 装备 Tab -->
        <div v-if="activeTab === 'equip'" class="talent-list animate-fade-in">
          <div
            v-for="equip in pagedEquips"
            :key="equip.IDs"
            class="equip-detail-card"
            @click="openDetail(equip)"
          >
            <div class="detail-row-first">
              <div class="detail-card-left">
                <div class="equip-detail-icon-slot" :style="{ backgroundColor: getStepConfig(equip.Step).lightBg }">
                  <img :src="`/Equip/${equip.IDs}.png`" :alt="equip.Name" class="equip-detail-icon game-sprite" />
                </div>
                <div class="equip-detail-name" :style="{ color: getStepConfig(equip.Step).color }">
                  {{ equip.Name }}
                  <span v-if="isRareEquip(equip)" class="rare-equip-tag">稀有</span>
                </div>
              </div>
              <div class="detail-card-attributes">
                <template v-for="attr in ATTRIBUTE_MAP" :key="attr.key">
                  <div v-if="equip[attr.key] > 0" class="base-attr-tag">
                    <img :src="`/General/${attr.icon}`" class="attr-mini-icon game-sprite" />
                    <span>{{ equip[attr.key] }}</span>
                  </div>
                </template>
              </div>
            </div>
            <div class="detail-row-bond" v-for="bondKey in ['Pure', 'Title', 'Enhance']" :key="bondKey">
              <template v-if="equip[bondKey]">
                <div class="bond-meta-line">
                  <span class="bond-title-text" :style="{ color: getBondColor(equip[bondKey]) }">{{ getBondDisplay(equip[bondKey]) }}</span>
                  <span class="bond-type-tag">{{ getBondType(equip[bondKey]) }}</span>
                </div>
                <div class="bond-desc-line">{{ getBondDesc(equip[bondKey]) }}</div>
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- 未检索到数据 -->
      <div v-if="totalFilteredCount === 0" class="no-data" style="padding: 40px 0;">
        没有找到符合搜索条件的条目数据
      </div>

      <!-- 滚动加载指示器/哨兵 -->
      <div ref="loadMoreSentinel" class="load-more-sentinel" style="height: 20px; width: 100%; margin-top: 10px;"></div>
    </div>

    <!-- 角色绑定来源弹窗 (天赋, 支援, 技能 统一使用) -->
    <div v-if="sourceModalVisible" class="modal-overlay" @click.self="closeSourceModal">
      <div class="modal-window">
        <div class="modal-header">
          <h3>{{ sourceModalTitle }}</h3>
          <button class="modal-close-x" @click="closeSourceModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="match-chars-grid">
            <div
              v-for="hero in sourceMatchedCharacters"
              :key="hero.id"
              class="matched-hero-card"
            >
              <span :class="`wish-rarity-color-${getRarityNum(hero.step)}`" class="hero-name-span">
                {{ hero.displayName }}
              </span>
              <div class="hero-labels-container">
                <span v-if="hero.class" class="h-lbl label-job">{{ hero.class }}</span>
                <span v-if="hero.type" class="h-lbl label-race">{{ hero.type }}</span>
                <span v-if="hero.element" class="h-lbl label-attr">{{ hero.element }}</span>
              </div>
            </div>
            <div v-if="sourceMatchedCharacters.length === 0" class="matched-hero-none">
              未找到对应的匹配角色
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- 装备详情大弹窗 -->
    <div v-if="detailModal.visible" class="modal-overlay" @click.self="closeDetail">
      <div class="equip-detail-window">
        <div class="equip-modal-header">
          <h2 class="centered-modal-title" :style="{ color: getStepConfig(detailModal.data.Step).color }">
            {{ detailModal.data.Name }}
          </h2>
          <button class="relic-modal-close" @click="closeDetail">✕</button>
        </div>

        <div class="equip-modal-body">
          <!-- 头部三栏布局：星级切换（左）、图标（中）、部位职业（右） -->
          <div class="modal-top-row">
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
                  :style="{ cursor: detailModal.data.Step === 'SS' ? 'not-allowed' : 'pointer', opacity: detailModal.data.Step === 'SS' ? 0.75 : 1 }"
                  @click="toggleInherit"
                >
                  传承
                </span>
              </div>
            </div>

            <div class="modal-icon-center" :style="{ backgroundColor: getStepConfig(detailModal.data.Step).lightBg }">
              <img :src="`/Equip/${detailModal.data.IDs}.png`" class="relic-detail-img game-sprite" />
            </div>

            <div class="modal-tags-right">
              <span v-if="modalTags.slot1" class="modal-info-tag class-tag">{{ modalTags.slot1 }}</span>
              <div v-else></div>
              <span v-if="modalTags.slot2" class="modal-info-tag class-tag">{{ modalTags.slot2 }}</span>
              <div v-else></div>
              <span v-if="modalTags.slot3" class="modal-info-tag type-tag">{{ modalTags.slot3 }}</span>
              <div v-else></div>
              <span v-if="modalTags.slot4" class="modal-info-tag class-tag">{{ modalTags.slot4 }}</span>
              <div v-else></div>
            </div>
          </div>

          <!-- 装备描述 Description -->
          <div class="modal-description-row" v-if="detailModal.data.Description">
            {{ detailModal.data.Description }}
          </div>

          <!-- 第3部分: 装备属性 5个格子均分 -->
          <div class="modal-attributes-grid">
            <div
              v-for="i in 5"
              :key="i"
              class="attribute-cell-box"
              :style="{
                border: !getActiveAttributes(detailModal.data)[i - 1] ? 'none' : '',
                background: !getActiveAttributes(detailModal.data)[i - 1] ? 'transparent' : '',
                opacity: !getActiveAttributes(detailModal.data)[i - 1] ? 0 : 1
              }"
            >
              <template v-if="getActiveAttributes(detailModal.data)[i - 1]">
                <img
                  :src="`/General/${getActiveAttributes(detailModal.data)[i - 1].icon}`"
                  class="attr-grid-icon game-sprite"
                />
                <span class="attr-grid-val">
                  +{{ getAttrVal(detailModal.data, getActiveAttributes(detailModal.data)[i - 1].key, selectedStar) }}
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
              <template v-if="detailModal.data[bondKey]">
                <div class="bond-item-header" @click="toggleBondExpand(idx)">
                  <span class="bond-item-name" :style="{ color: getBondColor(detailModal.data[bondKey]) }">
                    {{ getBondNameWithLevel(detailModal.data[bondKey], bondKey) }}
                  </span>
                  <div class="bond-item-header-right">
                    <span class="bond-item-type">[{{ getBondType(detailModal.data[bondKey]) }}]</span>
                    <img
                      src="/ui/up.svg"
                      class="bond-collapse-icon"
                      :class="{ collapsed: !expandedBonds[idx] }"
                    />
                  </div>
                </div>
                <div class="bond-item-basic-desc">
                  {{ getBondDesc(detailModal.data[bondKey]) }}
                </div>

                <!-- 可折叠展开的效果列表 -->
                <div v-show="expandedBonds[idx]" class="bond-expanded-list">
                  <div
                    v-for="(row, rIdx) in getBondRows(detailModal.data[bondKey])"
                    :key="rIdx"
                    :class="['expanded-row', { active: isBondRowActive(detailModal.data[bondKey], bondKey, rIdx) }]"
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
            <div class="source-content-text">{{ detailModal.data.AreaName || '不限' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 置顶组件 -->
    <BackToTop scrollContainer=".block-list-scroll" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, reactive, nextTick } from 'vue'
import * as configUtil from '@/utils/configTableUtil.js'
import BackToTop from '@/components/BackToTop.vue'
import { getVisibleCharacters, isCharacterBlocked, isTalentVisible, getVisibleRaceNames, BLOCKED_CHARACTER_IDS } from '@/utils/characterFilter'
import { getCategoryByTag, getPositiveCategoryByTag } from '@/utils/tagCategories'

// 静态数据库导入
import rawRoles from '@/assets/Role.json'
import rawTalents from '@/assets/Talent.json'
import rawSupportSkills from '@/assets/Sub_Skill.json'
import rawUniqueSkills from '@/assets/Unique.json'
import rawEquips from '@/assets/Equip.json'
import rawBonds from '@/assets/Bond.json'

// =================== 配置和常量 ===================

const ATTRIBUTE_MAP = [
  { key: 'STR', label: '力量', icon: 'mid_ico_attribute_0004.png' },
  { key: 'INT', label: '精神', icon: 'mid_ico_attribute_0002.png' },
  { key: 'DEX', label: '敏捷', icon: 'mid_ico_attribute_0005.png' },
  { key: 'CONS', label: '生命', icon: 'mid_ico_attribute_0003.png' },
  { key: 'SPD', label: '速度', icon: 'mid_ico_attribute_0001.png' },
  { key: 'Luck', label: '幸运', icon: 'mid_ico_attribute_0010.png' },
  { key: 'Tough', label: '韧性', icon: 'mid_ico_attribute_0009.png' },
  { key: 'InitialMagic', label: '初始魔力', icon: 'mid_ico_attribute_0006.png' }
]

const attrNameToChinese = {
  STR: '力量', INT: '精神', DEX: '敏捷', CONS: '生命',
  SPD: '速度', Luck: '幸运', Tough: '韧性', InitialMagic: '初始魔力'
}

const tabs = [
  { id: 'all', name: '全部' },
  { id: 'talent', name: '天赋' },
  { id: 'subskill', name: '支援' },
  { id: 'unique', name: '技能' },
  { id: 'equip', name: '装备' }
]

// =================== 基础数据响应式变量 ===================
const allCharacters = ref([])
const allTalentsList = ref([])
const allSubSkillsList = ref([])
const allUniquesList = ref([])
const allEquipsList = ref([])
const bondMap = new Map()

// =================== 搜索和过滤响应式变量 ===================
const searchQuery = ref('')
const showSubSearch = ref(false)
const subSearchQuery = ref('')
const activeTab = ref('all')
const talentLimit = ref(20)
const subSkillLimit = ref(20)
const uniqueLimit = ref(20)
const equipLimit = ref(20)
const listContainer = ref(null)
const loadMoreSentinel = ref(null)
let observer = null

const isDataReady = ref(false)

// =================== 效果标签展开与筛选状态 ===================
const subskillTagsExpanded = ref(false)
const uniqueTagsExpanded = ref(false)
const equipTagsExpanded = ref(false)

const selectedSubSkillTags = ref([])
const selectedUniqueTags = ref([])
const selectedEquipTags = ref([])

const selectedSubSkillStar = ref(null)
const toggleSubSkillStarFilter = (star) => {
  if (selectedSubSkillStar.value === star) {
    selectedSubSkillStar.value = null
  } else {
    selectedSubSkillStar.value = star
  }
}

// =================== 弹窗相关响应式变量 ===================
// 角色来源弹窗
const sourceModalVisible = ref(false)
const sourceModalTitle = ref('角色绑定来源')
const currentActiveItem = ref(null)
const currentSource = ref('')
const sourceMatchedCharacters = ref([])

// 装备详情弹窗
const detailModal = ref({ visible: false, data: {} })
const selectedStar = ref(0)
const selectedInherit = ref(false)
const expandedBonds = ref([false, false, false])

const loadMore = () => {
  if (activeTab.value === 'all') {
    if (talentLimit.value < filteredTalents.value.length) {
      talentLimit.value = Math.min(talentLimit.value + 20, filteredTalents.value.length)
    } else if (subSkillLimit.value < filteredSubSkills.value.length) {
      subSkillLimit.value = Math.min(subSkillLimit.value + 20, filteredSubSkills.value.length)
    } else if (uniqueLimit.value < filteredUniques.value.length) {
      uniqueLimit.value = Math.min(uniqueLimit.value + 20, filteredUniques.value.length)
    } else if (equipLimit.value < filteredEquips.value.length) {
      equipLimit.value = Math.min(equipLimit.value + 20, filteredEquips.value.length)
    }
  } else if (activeTab.value === 'talent') {
    if (talentLimit.value < filteredTalents.value.length) {
      talentLimit.value = Math.min(talentLimit.value + 20, filteredTalents.value.length)
    }
  } else if (activeTab.value === 'subskill') {
    if (subSkillLimit.value < filteredSubSkills.value.length) {
      subSkillLimit.value = Math.min(subSkillLimit.value + 20, filteredSubSkills.value.length)
    }
  } else if (activeTab.value === 'unique') {
    if (uniqueLimit.value < filteredUniques.value.length) {
      uniqueLimit.value = Math.min(uniqueLimit.value + 20, filteredUniques.value.length)
    }
  } else if (activeTab.value === 'equip') {
    if (equipLimit.value < filteredEquips.value.length) {
      equipLimit.value = Math.min(equipLimit.value + 20, filteredEquips.value.length)
    }
  }
}

const checkScrollHeight = () => {
  nextTick(() => {
    if (!listContainer.value) return
    const el = listContainer.value
    if (el.scrollHeight <= el.clientHeight) {
      const prevTotal = talentLimit.value + subSkillLimit.value + uniqueLimit.value + equipLimit.value
      loadMore()
      const newTotal = talentLimit.value + subSkillLimit.value + uniqueLimit.value + equipLimit.value
      if (newTotal > prevTotal) {
        checkScrollHeight()
      }
    }
  })
}

const resetLimits = () => {
  if (activeTab.value === 'all') {
    talentLimit.value = 20
    subSkillLimit.value = 20
    uniqueLimit.value = 20
    equipLimit.value = 20
  } else {
    talentLimit.value = activeTab.value === 'talent' ? 20 : 0
    subSkillLimit.value = activeTab.value === 'subskill' ? 20 : 0
    uniqueLimit.value = activeTab.value === 'unique' ? 20 : 0
    equipLimit.value = activeTab.value === 'equip' ? 20 : 0
  }
  nextTick(() => {
    checkScrollHeight()
  })
}

watch([
  activeTab,
  searchQuery,
  subSearchQuery,
  selectedSubSkillStar,
  selectedSubSkillTags,
  selectedUniqueTags,
  selectedEquipTags
], () => {
  resetLimits()
}, { deep: true })

// =================== 页面数据挂载与组装 ===================
onMounted(() => {
  // 延迟执行繁重的数据组装逻辑，避免阻塞页面路由切换，实现秒进页面后加载
  setTimeout(() => {
    const rawRoleArr = configUtil.extractDataArray(rawRoles)
    const rawTalentArr = configUtil.extractDataArray(rawTalents)
    const rawSupportArr = configUtil.extractDataArray(rawSupportSkills)
    const rawUniqueArr = configUtil.extractDataArray(rawUniqueSkills)
    const rawEquipArr = configUtil.extractDataArray(rawEquips)
    const rawBondArr = configUtil.extractDataArray(rawBonds)

    // 1. 构建词条 Map
    rawBondArr.forEach(b => {
      if (b.Name) bondMap.set(b.Name, b)
    })

    // 2. 组装角色数据集
    const fullDatasets = {
      supportList: rawSupportArr,
      skillList: rawUniqueArr,
      talentList: rawTalentArr,
      relicList: [],
      noteList: []
    }
    // 过滤隐藏开发或测试阶段的角色（如假人等），防止其出现在来源绑定弹窗中
    const fullCharacters = getVisibleCharacters(configUtil.getFullCharacterList(rawRoleArr, fullDatasets))
    allCharacters.value = fullCharacters

    // 3. 组装天赋列表 (以 qualities 汇总结构组合)
    allTalentsList.value = loadTalents(rawTalentArr, fullCharacters)

    // 4. 组装支援技能列表
    allSubSkillsList.value = loadSubSkills(fullCharacters)

    // 5. 组装主动技能列表
    allUniquesList.value = loadUniques(fullCharacters)

    // 6. 组装装备列表 (附带动态词条 Tag)
    allEquipsList.value = loadEquips(rawEquipArr)

    // 初始化加载限制并检查视口填充
    resetLimits()
    isDataReady.value = true
    initObserver()
  }, 20)
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})

// =================== 核心数据解析加载函数 ===================
const getRarityNum = (step = 'C') => {
  const map = { 'S': 3, 'A': 2, 'B': 1, 'C': 0 }
  return map[String(step).toUpperCase()] ?? 0
}

const getTalentStepConfig = (step = '') => {
  const map = {
    S: { weight: 4, color: '#f97316', label: 'S' },
    A: { weight: 3, color: '#a855f7', label: 'A' },
    B: { weight: 2, color: '#60a5fa', label: 'B' },
    C: { weight: 1, color: '#10b981', label: 'C' },
    '': { weight: 0, color: '#94a3b8', label: '未知' }
  }
  return map[String(step).toUpperCase()] ?? map['']
}

const getStepConfig = (step) => {
  const map = {
    'SS': { label: 'SS', color: '#f43f5e', lightBg: 'rgba(244, 63, 94, 0.1)' },
    'S': { label: 'S', color: '#f97316', lightBg: 'rgba(249, 115, 22, 0.1)' },
    'A': { label: 'A', color: '#a855f7', lightBg: 'rgba(168, 85, 247, 0.1)' },
    'B': { label: 'B', color: '#60a5fa', lightBg: 'rgba(96, 165, 250, 0.1)' },
    'C': { label: 'C', color: '#16a34a', lightBg: 'rgba(22, 163, 74, 0.1)' }
  }
  return map[step] || { label: step, color: '#64748b', lightBg: 'rgba(100, 116, 139, 0.1)' }
}

const getRaceCategory = (raceName) => {
  const matchChar = allCharacters.value.find(c => c.race?.name === raceName)
  return matchChar ? matchChar.type : '生灵'
}

const getTypeTag = (t) => {
  if (t.SpecifyRoleIDs) return '专属'
  if (!t.Race && !t.Class && !t.Element) return '通用'
  if (t.Race) return t.Race
  if (t.Class) return t.Class
  if (t.Element) return t.Element
  return '通用'
}

const sortTalentAllQuality = (talentArr = []) => {
  const nameMap = new Map()
  talentArr.forEach(item => {
    const name = item.name || '无名天赋'
    if (!nameMap.has(name)) nameMap.set(name, [])
    nameMap.get(name).push(item)
  })
  const final = []
  nameMap.forEach(list => {
    list.sort((a, b) => {
      const wa = getTalentStepConfig(a.step).weight
      const wb = getTalentStepConfig(b.step).weight
      return wb - wa
    })
    final.push(...list)
  })
  return final
}

const loadTalents = (rawTalentArr, fullCharacters) => {
  const visibleRaceNames = getVisibleRaceNames(fullCharacters)
  const cleanTalentList = rawTalentArr.map((t, idx) => {
    const base = {
      uid: t.IDs || t.Id || t.TalentID || `t_${idx}`,
      name: t.Name || t.TalentName || t.天赋名称 || '未命名天赋',
      step: t.Step || t.TalentStep || t.品质 || t.品阶 || '',
      Race: t.Race || '',
      Class: t.Class || '',
      Element: t.Element || '',
      SpecifyRoleIDs: t.SpecifyRoleIDs || '',
      Value0: t.Value0 ?? 0,
      Value1: t.Value1 ?? 0,
      Value2: t.Value2 ?? 0,
      formattedEffect: configUtil.replacePlaceholders(t.Effect || '', [t.Value0, t.Value1, t.Value2]),
      iconId: t.Icon || t.icon || 'default'
    }
    const rawLabel = configUtil.getTalentSourceLabel(base, fullCharacters)
    base.sourceLabel = (rawLabel || '').replace('职业', '').replace('属性', '')
    return base
  })
  // 隐藏未放出角色专属天赋、未放出种族天赋、以及测试专属天赋
  .filter(t => isTalentVisible(t, fullCharacters, visibleRaceNames) && !t.sourceLabel.startsWith('专属('))

  const sortedCleanList = sortTalentAllQuality(cleanTalentList)
  sortedCleanList.forEach(t => {
    t.标签 = t.SpecifyRoleIDs ? '专属' : (t.Class ? '职业' : (t.Element ? '属性' : (t.Race ? getRaceCategory(t.Race) : '通用')))
    t.二级类目 = t.SpecifyRoleIDs ? t.SpecifyRoleIDs : (t.Race || t.Class || t.Element || '通用')
  })

  const nameMap = new Map()
  sortedCleanList.forEach(t => {
    const name = t.name
    if (!nameMap.has(name)) {
      nameMap.set(name, [])
    }
    nameMap.get(name).push(t)
  })

  const groupedCleanList = []
  nameMap.forEach((qualities, name) => {
    const highestQuality = qualities[0]
    const groupItem = {
      name: name,
      qualities: qualities,
      activeIdx: 0,
      dropdownOpen: false,
      uid: highestQuality.uid,
      step: highestQuality.step,
      标签: highestQuality.标签,
      sourceLabel: highestQuality.sourceLabel,
      formattedEffect: highestQuality.formattedEffect,
      二级类目: highestQuality.二级类目,
      SpecifyRoleIDs: highestQuality.SpecifyRoleIDs,
      Race: highestQuality.Race,
      Class: highestQuality.Class,
      Element: highestQuality.Element,
      iconId: highestQuality.iconId
    }
    groupedCleanList.push(groupItem)
  })
  return groupedCleanList
}

// 加载支援技能
const loadSubSkills = (fullCharacters) => {
  const list = []
  fullCharacters.forEach(c => {
    const skills = [
      c.supportSkills.characteristic,
      c.supportSkills.subClass,
      c.supportSkills.feature
    ]
    skills.forEach(s => {
      if (s && s.id) {
        const prefixTags = []
        const regex = /【([^】]+)】/g
        let m
        const descText = s.formattedDesc || s.description || ''
        while ((m = regex.exec(descText)) !== null) {
          if (m[1]) {
            const cleanTag = m[1].trim()
            if (cleanTag && !prefixTags.includes(cleanTag)) {
              prefixTags.push(cleanTag)
            }
          }
        }
        list.push({
          uid: `${c.id}_${s.star}`,
          name: s.name || '未命名支援',
          step: c.step,
          标签: `${s.star}星`,
          star: s.star,
          formattedEffect: s.formattedDesc || '无描述',
          sourceLabel: c.displayName,
          character: c,
          charId: c.id,
          iconId: s.Icon || s.icon || 'default',
          filterTags: [...prefixTags, ...(s.filterTags || [])]
        })
      }
    })
  })

  list.sort((a, b) => {
    const isDummyA = a.sourceLabel === '假人'
    const isDummyB = b.sourceLabel === '假人'
    if (isDummyA !== isDummyB) return isDummyA ? 1 : -1
    const wa = getTalentStepConfig(a.step).weight
    const wb = getTalentStepConfig(b.step).weight
    if (wa !== wb) return wb - wa
    if (a.character.id !== b.character.id) return a.character.id.localeCompare(b.character.id)
    return a.star - b.star
  })
  return list
}

// 加载主动技能
const loadUniques = (fullCharacters) => {
  const list = []
  fullCharacters.forEach(c => {
    c.activeSkills.forEach(s => {
      const prefixTags = []
      const regex = /【([^】]+)】/g
      let m
      const descText = s.formattedDesc || s.description || ''
      while ((m = regex.exec(descText)) !== null) {
        if (m[1]) {
          const cleanTag = m[1].trim()
          if (cleanTag && !prefixTags.includes(cleanTag)) {
            prefixTags.push(cleanTag)
          }
        }
      }

      const ownerName = (s.owner || c.displayName || '').trim()
      const rawTags = [...(s.positiveTags || []), ...(s.negativeTags || [])]
      const dbTagsFiltered = rawTags
        .map(t => t.trim())
        .filter(t => {
          if (!t) return false
          if (ownerName && t.includes(ownerName)) return false
          return true
        })

      list.push({
        uid: s.id,
        name: s.name || '未命名技能',
        step: c.step,
        target: s.target,
        maxTarget: s.maxTarget,
        times: s.times,
        skillType: s.skillType,
        actionType: s.actionType,
        targetType: s.targetType,
        formattedEffect: s.formattedDesc || '无描述',
        sourceLabel: c.displayName,
        character: c,
        charId: c.id,
        iconId: s.icon || 'default',
        filterTags: [...prefixTags, ...dbTagsFiltered]
      })
    })
  })

  list.sort((a, b) => {
    const isDummyA = a.sourceLabel === '假人'
    const isDummyB = b.sourceLabel === '假人'
    if (isDummyA !== isDummyB) return isDummyA ? 1 : -1
    const wa = getTalentStepConfig(a.step).weight
    const wb = getTalentStepConfig(b.step).weight
    if (wa !== wb) return wb - wa
    if (a.character.id !== b.character.id) return a.character.id.localeCompare(b.character.id)
    return a.uid.localeCompare(b.uid)
  })
  return list
}

// 加载装备
const loadEquips = (rawEquipArr) => {
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
    return {
      ...item,
      filterTags: Array.from(tags)
    }
  })
}

// =================== 装备词条辅助逻辑 ===================
const parseBondInfo = (bondStr) => {
  if (!bondStr) return null
  const m = bondStr.match(/^(.+)\[(\d+)\]$/)
  if (m) return { name: m[1], baseLvl: parseInt(m[2]) }
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

const rareDropsMap = {
  "新生平原": ["狙击机弩","狙击箭矢","地灵长杖","狙击项链", "地灵法球", "聆风魔弓", "聆风魔矢", "聆风魔靴"],
  "广袤草原": ["火羽披风","火羽腰带","火羽长靴","飞羽护臂","飞羽徽章","飞羽项链"],
  "铁血高地": ["魔王战靴","魔王腰带","魔王头冠","死神徽章","死神腰带","死神兜帽","统帅战靴","统帅战甲","统帅战盔"],
  "迷失森林": ["神树护臂","神树束腰","神树战靴","慈爱头冠","慈爱长袍","慈爱项链","森林圣物","森林王冠","森林之心"],
  "幽暗密林": ["梦魇魔盔","梦魇魔铠","梦魇魔爪","龙魂战盔","龙魂战甲","龙魂之心","恶意纹章","恶意项链","恶意戒指"],
  "清凉沙滩": ["天使羽弓","天使光环","天使羽翼","泰坦战盔","泰坦战甲","泰坦护手","无瑕权杖","无瑕盾牌","无瑕长袍"],
  "遗忘之海": ["流水项链","流水指环","流水徽章","邪神权杖","邪神之冠","邪神束带","","",""],
  "废弃矿洞": ["炼狱宝珠","炼狱手套","炼狱腰带","","","","","",""],
  "洞穴深处": ["维生头罩","维生装甲","维生芯片","","","","","",""],
  "极寒冰原": ["冰蛛披肩","冰蛛手套","冰蛛纹章","冰羽利刃","冰羽斗篷","冰羽神靴","","",""],
  "荒凉戈壁": ["光辉权杖","光辉头环","光辉羽织", "光辉圣徽", "光辉之心", "光辉宝戒", "舞姬面纱","舞姬手环","舞姬束带"],
  "无尽荒漠": ["许愿神灯","许愿项链","许愿戒指","许愿束带","许愿护臂","许愿头环","","",""],
  "熔岩通道": ["熔岩重弩","熔岩重矢","熔岩戒指","烈火魔杖","烈火宝珠","烈火长袍","","",""]
}

const isRareEquip = (equip) => {
  if (!equip || !equip.Name || !equip.AreaName) return false
  const list = rareDropsMap[equip.AreaName]
  return list ? list.includes(equip.Name) : false
}

// =================== 列表过滤逻辑 ===================

// 提取当前所有的搜索关键词 (包括主搜和次筛)
const queryKeywords = computed(() => {
  const qStr = searchQuery.value.trim().toLowerCase()
  const subQStr = subSearchQuery.value.trim().toLowerCase()
  return [qStr, subQStr].filter(Boolean)
})

const getCategoryOrder = (t) => {
  if (t.SpecifyRoleIDs) return 1  // 专属
  if (t.Race) return 2            // 种族
  if (t.Class) return 3           // 职业
  if (t.Element) return 4         // 属性
  return 5                        // 通用
}

const sortRule = (a, b) => {
  const catA = getCategoryOrder(a)
  const catB = getCategoryOrder(b)
  if (catA !== catB) {
    return catA - catB
  }
  const wa = getTalentStepConfig(a.step).weight
  const wb = getTalentStepConfig(b.step).weight
  return wb - wa
}

// 1. 过滤后的天赋
const filteredTalents = computed(() => {
  let list = allTalentsList.value
  const q = searchQuery.value.trim().toLowerCase()
  const subQ = subSearchQuery.value.trim().toLowerCase()

  // 主检索
  if (q) {
    list = list.filter(item => {
      const matchName = item.name && item.name.toLowerCase().includes(q)
      const matchDesc = item.formattedEffect && item.formattedEffect.toLowerCase().includes(q)
      const matchSource = item.sourceLabel && item.sourceLabel.toLowerCase().includes(q)
      const matchTag = item.标签 && item.标签.toLowerCase().includes(q)
      return matchName || matchDesc || matchSource || matchTag
    })
  }

  // 次级筛选
  if (subQ) {
    list = list.filter(item => {
      const matchName = item.name && item.name.toLowerCase().includes(subQ)
      const matchDesc = item.formattedEffect && item.formattedEffect.toLowerCase().includes(subQ)
      const matchSource = item.sourceLabel && item.sourceLabel.toLowerCase().includes(subQ)
      const matchTag = item.标签 && item.标签.toLowerCase().includes(subQ)
      return matchName || matchDesc || matchSource || matchTag
    })
  }

  return [...list].sort(sortRule)
})

// 2. 过滤后的支援技能
const filteredSubSkills = computed(() => {
  let list = allSubSkillsList.value
  const q = searchQuery.value.trim().toLowerCase()
  const subQ = subSearchQuery.value.trim().toLowerCase()

  // 星级筛选
  if (selectedSubSkillStar.value) {
    list = list.filter(item => item.star === selectedSubSkillStar.value)
  }

  // 标签筛选
  if (selectedSubSkillTags.value.length > 0) {
    list = list.filter(item => {
      return selectedSubSkillTags.value.every(tag => item.filterTags && item.filterTags.includes(tag))
    })
  }

  // 主检索
  if (q) {
    list = list.filter(item => {
      const matchName = item.name && item.name.toLowerCase().includes(q)
      const matchDesc = item.formattedEffect && item.formattedEffect.toLowerCase().includes(q)
      const matchSource = item.sourceLabel && item.sourceLabel.toLowerCase().includes(q)
      const matchTag = item.filterTags && item.filterTags.some(t => t.toLowerCase().includes(q))
      return matchName || matchDesc || matchSource || matchTag
    })
  }

  // 次选检索
  if (subQ) {
    list = list.filter(item => {
      const matchName = item.name && item.name.toLowerCase().includes(subQ)
      const matchDesc = item.formattedEffect && item.formattedEffect.toLowerCase().includes(subQ)
      const matchSource = item.sourceLabel && item.sourceLabel.toLowerCase().includes(subQ)
      const matchTag = item.filterTags && item.filterTags.some(t => t.toLowerCase().includes(subQ))
      return matchName || matchDesc || matchSource || matchTag
    })
  }

  return list
})

// 3. 过滤后的主动技能
const filteredUniques = computed(() => {
  let list = allUniquesList.value
  const q = searchQuery.value.trim().toLowerCase()
  const subQ = subSearchQuery.value.trim().toLowerCase()

  // 标签筛选
  if (selectedUniqueTags.value.length > 0) {
    list = list.filter(item => {
      return selectedUniqueTags.value.every(tag => item.filterTags && item.filterTags.includes(tag))
    })
  }

  // 主检索
  if (q) {
    list = list.filter(item => {
      const matchName = item.name && item.name.toLowerCase().includes(q)
      const matchDesc = item.formattedEffect && item.formattedEffect.toLowerCase().includes(q)
      const matchSource = item.sourceLabel && item.sourceLabel.toLowerCase().includes(q)
      const matchTag = item.filterTags && item.filterTags.some(t => t.toLowerCase().includes(q))
      return matchName || matchDesc || matchSource || matchTag
    })
  }

  // 次选检索
  if (subQ) {
    list = list.filter(item => {
      const matchName = item.name && item.name.toLowerCase().includes(subQ)
      const matchDesc = item.formattedEffect && item.formattedEffect.toLowerCase().includes(subQ)
      const matchSource = item.sourceLabel && item.sourceLabel.toLowerCase().includes(subQ)
      const matchTag = item.filterTags && item.filterTags.some(t => t.toLowerCase().includes(subQ))
      return matchName || matchDesc || matchSource || matchTag
    })
  }

  return list
})

// 4. 过滤后的装备
const filteredEquips = computed(() => {
  let list = allEquipsList.value
  const q = searchQuery.value.trim().toLowerCase()
  const subQ = subSearchQuery.value.trim().toLowerCase()

  // 标签筛选
  if (selectedEquipTags.value.length > 0) {
    list = list.filter(item => {
      return selectedEquipTags.value.every(tag => item.filterTags && item.filterTags.includes(tag))
    })
  }

  // 主检索
  if (q) {
    list = list.filter(item => {
      const matchName = item.Name && item.Name.toLowerCase().includes(q)
      const matchDesc = item.Description && item.Description.toLowerCase().includes(q)
      const matchTag = item.filterTags && item.filterTags.some(t => t.toLowerCase().includes(q))

      let matchBonds = false
      for (const key of ['Pure', 'Title', 'Enhance']) {
        const val = item[key]
        if (val) {
          if (val.toLowerCase().includes(q)) {
            matchBonds = true
            break
          }
          const info = parseBondInfo(val)
          if (info) {
            const bObj = bondMap.get(info.name)
            if (bObj) {
              const matchBondName = bObj.Name && bObj.Name.toLowerCase().includes(q)
              const matchBondBasic = bObj.BasicDescription && bObj.BasicDescription.toLowerCase().includes(q)
              const matchBondEffect = bObj.EffectDescription && bObj.EffectDescription.toLowerCase().includes(q)
              if (matchBondName || matchBondBasic || matchBondEffect) {
                matchBonds = true
                break
              }
            }
          }
        }
      }

      return matchName || matchDesc || matchBonds || matchTag
    })
  }

  // 次选检索
  if (subQ) {
    list = list.filter(item => {
      const matchName = item.Name && item.Name.toLowerCase().includes(subQ)
      const matchDesc = item.Description && item.Description.toLowerCase().includes(subQ)
      const matchTag = item.filterTags && item.filterTags.some(t => t.toLowerCase().includes(subQ))

      let matchBonds = false
      for (const key of ['Pure', 'Title', 'Enhance']) {
        const val = item[key]
        if (val) {
          if (val.toLowerCase().includes(subQ)) {
            matchBonds = true
            break
          }
          const info = parseBondInfo(val)
          if (info) {
            const bObj = bondMap.get(info.name)
            if (bObj) {
              const matchBondName = bObj.Name && bObj.Name.toLowerCase().includes(subQ)
              const matchBondBasic = bObj.BasicDescription && bObj.BasicDescription.toLowerCase().includes(subQ)
              const matchBondEffect = bObj.EffectDescription && bObj.EffectDescription.toLowerCase().includes(subQ)
              if (matchBondName || matchBondBasic || matchBondEffect) {
                matchBonds = true
                break
              }
            }
          }
        }
      }

      return matchName || matchDesc || matchBonds || matchTag
    })
  }

  // 品质（Step）降序 + 地图升序排序
  return [...list].sort((a, b) => {
    const stepA = getStepWeight(a.Step)
    const stepB = getStepWeight(b.Step)
    if (stepA !== stepB) return stepA - stepB
    const mapA = getMapWeight(a.AreaName)
    const mapB = getMapWeight(b.AreaName)
    return mapA - mapB
  })
})

const getStepWeight = (step) => {
  const weights = { 'SS': 1, 'S': 2, 'A': 3, 'B': 4, 'C': 5 }
  return weights[step] || 99
}

const getMapWeight = (map) => {
  const weights = {
    '世界': 1, '新生平原': 2, '广袤草原': 3, '铁血高地': 4, '迷失森林': 5,
    '幽暗密林': 6, '清凉沙滩': 7, '遗忘之海': 8, '废弃矿洞': 9, '洞穴深处': 10,
    '极寒冰原': 11, '荒凉戈壁': 12, '无尽荒漠': 13, '熔岩通道': 14
  }
  return weights[map] || 99
}

// 汇总结果数
const totalFilteredCount = computed(() => {
  if (activeTab.value === 'all') {
    return filteredTalents.value.length + filteredSubSkills.value.length + filteredUniques.value.length + filteredEquips.value.length
  }
  if (activeTab.value === 'talent') return filteredTalents.value.length
  if (activeTab.value === 'subskill') return filteredSubSkills.value.length
  if (activeTab.value === 'unique') return filteredUniques.value.length
  if (activeTab.value === 'equip') return filteredEquips.value.length
  return 0
})

// =================== 分页与无限滚动 ===================
const pagedTalents = computed(() => filteredTalents.value.slice(0, talentLimit.value))
const pagedSubSkills = computed(() => filteredSubSkills.value.slice(0, subSkillLimit.value))
const pagedUniques = computed(() => filteredUniques.value.slice(0, uniqueLimit.value))
const pagedEquips = computed(() => filteredEquips.value.slice(0, equipLimit.value))

const handleScroll = (e) => {
  const el = e.target
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
    loadMore()
  }
}

const initObserver = () => {
  if (typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry && entry.isIntersecting) {
      loadMore()
    }
  }, {
    rootMargin: '200px',
    threshold: 0
  })

  if (loadMoreSentinel.value) {
    observer.observe(loadMoreSentinel.value)
  }
}

watch(loadMoreSentinel, (newVal) => {
  if (newVal && observer) {
    observer.observe(newVal)
  }
})

// =================== 标签池计算与方法 (支援, 技能, 装备) ===================

// Helper sorting rank
const getTagSortRank = (t, selectedList) => {
  if (selectedList.includes(t)) return 1
  return 5
}

// 1. 支援技能 Tag 池
const allSubSkillTags = computed(() => {
  const tags = new Set()
  selectedSubSkillTags.value.forEach(t => tags.add(t))

  const keywords = queryKeywords.value
  const dbTags = new Set()
  allSubSkillsList.value.forEach(item => {
    if (item.filterTags) item.filterTags.forEach(t => dbTags.add(t))
  })

  dbTags.forEach(t => {
    if (keywords.includes(t.toLowerCase())) tags.add(t)
  })

  filteredSubSkills.value.forEach(item => {
    if (item.filterTags) item.filterTags.forEach(t => tags.add(t))
  })

  const list = Array.from(tags)
  list.sort((a, b) => {
    const ra = getTagSortRank(a, selectedSubSkillTags.value)
    const rb = getTagSortRank(b, selectedSubSkillTags.value)
    if (ra !== rb) return ra - rb
    return a.localeCompare(b, 'zh')
  })
  return list
})

const isSubSkillTagActive = (tag) => {
  return selectedSubSkillTags.value.includes(tag) || queryKeywords.value.includes(tag.toLowerCase())
}

const toggleSubSkillTag = (tag) => {
  const inSel = selectedSubSkillTags.value.includes(tag)
  const inQ = queryKeywords.value.includes(tag.toLowerCase())
  if (inSel || inQ) {
    if (inSel) {
      const idx = selectedSubSkillTags.value.indexOf(tag)
      selectedSubSkillTags.value.splice(idx, 1)
    }
    if (inQ) removeKeywordFromSearch(tag)
  } else {
    selectedSubSkillTags.value.push(tag)
  }
  resetLimits()
  resetScroll()
}

// 2. 主动技能 Tag 池
const allUniqueTags = computed(() => {
  const tags = new Set()
  selectedUniqueTags.value.forEach(t => tags.add(t))

  const keywords = queryKeywords.value
  const dbTags = new Set()
  allUniquesList.value.forEach(item => {
    if (item.filterTags) item.filterTags.forEach(t => dbTags.add(t))
  })

  dbTags.forEach(t => {
    if (keywords.includes(t.toLowerCase())) tags.add(t)
  })

  filteredUniques.value.forEach(item => {
    if (item.filterTags) item.filterTags.forEach(t => tags.add(t))
  })

  const list = Array.from(tags).filter(t => !t.endsWith('符文'))
  list.sort((a, b) => {
    const ra = getTagSortRank(a, selectedUniqueTags.value)
    const rb = getTagSortRank(b, selectedUniqueTags.value)
    if (ra !== rb) return ra - rb
    return a.localeCompare(b, 'zh')
  })
  return list
})

const isUniqueTagActive = (tag) => {
  return selectedUniqueTags.value.includes(tag) || queryKeywords.value.includes(tag.toLowerCase())
}

const toggleUniqueTag = (tag) => {
  const inSel = selectedUniqueTags.value.includes(tag)
  const inQ = queryKeywords.value.includes(tag.toLowerCase())
  if (inSel || inQ) {
    if (inSel) {
      const idx = selectedUniqueTags.value.indexOf(tag)
      selectedUniqueTags.value.splice(idx, 1)
    }
    if (inQ) removeKeywordFromSearch(tag)
  } else {
    selectedUniqueTags.value.push(tag)
  }
  resetLimits()
  resetScroll()
}

// 3. 装备 Tag 池
const allEquipTags = computed(() => {
  const tags = new Set()
  selectedEquipTags.value.forEach(t => tags.add(t))

  const keywords = queryKeywords.value
  const dbTags = new Set()
  allEquipsList.value.forEach(item => {
    if (item.filterTags) item.filterTags.forEach(t => dbTags.add(t))
  })

  dbTags.forEach(t => {
    if (keywords.includes(t.toLowerCase())) tags.add(t)
  })

  filteredEquips.value.forEach(item => {
    if (item.filterTags) item.filterTags.forEach(t => tags.add(t))
  })

  const list = Array.from(tags)
  list.sort((a, b) => {
    const ra = getTagSortRank(a, selectedEquipTags.value)
    const rb = getTagSortRank(b, selectedEquipTags.value)
    if (ra !== rb) return ra - rb
    return a.localeCompare(b, 'zh')
  })
  return list
})

const isEquipTagActive = (tag) => {
  return selectedEquipTags.value.includes(tag) || queryKeywords.value.includes(tag.toLowerCase())
}

const toggleEquipTag = (tag) => {
  const inSel = selectedEquipTags.value.includes(tag)
  const inQ = queryKeywords.value.includes(tag.toLowerCase())
  if (inSel || inQ) {
    if (inSel) {
      const idx = selectedEquipTags.value.indexOf(tag)
      selectedEquipTags.value.splice(idx, 1)
    }
    if (inQ) removeKeywordFromSearch(tag)
  } else {
    selectedEquipTags.value.push(tag)
  }
  resetLimits()
  resetScroll()
}

// 综合页面各标签大类分组及格式化定义
const categorizedSubSkillTags = computed(() => {
  const groups = { "数值": [], "机制": [], "时机": [], "状态": [], "其他": [] }
  allSubSkillTags.value.forEach(tag => {
    const category = getCategoryByTag(tag)
    if (groups[category]) {
      groups[category].push(tag)
    } else {
      groups["其他"].push(tag)
    }
  })
  return Object.entries(groups)
    .filter(([_, tags]) => tags.length > 0)
    .map(([name, tags]) => {
      const sortedTags = [...tags].sort((a, b) => {
        const lenA = formatTagText(a).length
        const lenB = formatTagText(b).length
        return lenB - lenA
      })
      return { name, tags: sortedTags }
    })
})

const categorizedUniqueTags = computed(() => {
  const groups = { "数值": [], "机制": [], "时机": [], "状态": [], "其他": [] }
  allUniqueTags.value.forEach(tag => {
    const category = getPositiveCategoryByTag(tag)
    if (groups[category]) {
      groups[category].push(tag)
    } else {
      groups["其他"].push(tag)
    }
  })
  return Object.entries(groups)
    .filter(([_, tags]) => tags.length > 0)
    .map(([name, tags]) => {
      const sortedTags = [...tags].sort((a, b) => {
        const lenA = formatTagText(a).length
        const lenB = formatTagText(b).length
        return lenB - lenA
      })
      return { name, tags: sortedTags }
    })
})

const categorizedEquipTags = computed(() => {
  const groups = { "数值": [], "机制": [], "时机": [], "状态": [], "其他": [] }
  allEquipTags.value.forEach(tag => {
    const category = getCategoryByTag(tag)
    if (groups[category]) {
      groups[category].push(tag)
    } else {
      groups["其他"].push(tag)
    }
  })
  return Object.entries(groups)
    .filter(([_, tags]) => tags.length > 0)
    .map(([name, tags]) => {
      const sortedTags = [...tags].sort((a, b) => {
        const lenA = formatTagText(a).length
        const lenB = formatTagText(b).length
        return lenB - lenA
      })
      return { name, tags: sortedTags }
    })
})

const formatTagText = (tag) => {
  if (tag.endsWith('相关')) {
    return tag.slice(0, -2)
  }
  return tag
}

// 清除特定检索词
const removeKeywordFromSearch = (tag) => {
  const lowerTag = tag.toLowerCase()
  const filterInput = (refVar) => {
    const val = refVar.value || ''
    const words = val.split(/[\s,，]+/).filter(Boolean)
    const filtered = words.filter(w => w.toLowerCase() !== lowerTag)
    refVar.value = filtered.join(' ')
  }
  filterInput(searchQuery)
  filterInput(subSearchQuery)
}

// =================== Tab 切换 & 监听 ===================
const switchTab = (tabId) => {
  if (activeTab.value === tabId) {
    activeTab.value = 'all'
  } else {
    activeTab.value = tabId
  }
  resetLimits()
  resetScroll()
}

const resetScroll = () => {
  if (listContainer.value) listContainer.value.scrollTop = 0
}

watch([searchQuery, subSearchQuery, activeTab], (newVal, oldVal) => {
  if (oldVal && newVal[2] !== oldVal[2]) {
    selectedSubSkillStar.value = null
  }
  resetLimits()
  resetScroll()
})

watch(selectedSubSkillStar, () => {
  resetLimits()
  resetScroll()
})

watch(showSubSearch, (val) => {
  if (!val) {
    subSearchQuery.value = ''
  }
})

// =================== 天赋卡片 Quality Dropdown ===================
const toggleTagDropdown = (item) => {
  item.dropdownOpen = !item.dropdownOpen
}

const switchQuality = (item, qIdx) => {
  const selectedQuality = item.qualities[qIdx]
  item.activeIdx = qIdx
  item.step = selectedQuality.step
  item.标签 = selectedQuality.标签
  item.formattedEffect = selectedQuality.formattedEffect
  item.sourceLabel = selectedQuality.sourceLabel
  item.uid = selectedQuality.uid
  item.SpecifyRoleIDs = selectedQuality.SpecifyRoleIDs
  item.Race = selectedQuality.Race
  item.Class = selectedQuality.Class
  item.Element = selectedQuality.Element
  item.iconId = selectedQuality.iconId
  item.dropdownOpen = false
}

// =================== 弹窗交互方法 ===================

// 1. 角色绑定来源弹窗
const getTalentMatchedCharacters = (talent) => {
  if (!talent) return []
  if (talent.SpecifyRoleIDs) {
    return allCharacters.value.filter(c => c.id === talent.SpecifyRoleIDs)
  }
  if (talent.Race) {
    return allCharacters.value.filter(c => c.race?.name === talent.Race)
  }
  if (talent.Class) {
    return allCharacters.value.filter(c => c.class === talent.Class)
  }
  if (talent.Element) {
    return allCharacters.value.filter(c => c.element === talent.Element)
  }
  return []
}

const openSourceModal = (item, type) => {
  currentActiveItem.value = item
  currentSource.value = item.sourceLabel
  if (type === 'talent') {
    sourceModalTitle.value = '天赋归属: ' + item.sourceLabel
    const matched = getTalentMatchedCharacters(item)
    matched.sort((a, b) => getRarityNum(b.step) - getRarityNum(a.step))
    sourceMatchedCharacters.value = matched
  } else if (type === 'subskill') {
    sourceModalTitle.value = '支援来源: ' + item.sourceLabel
    sourceMatchedCharacters.value = [item.character]
  } else {
    sourceModalTitle.value = '技能归属: ' + item.sourceLabel
    sourceMatchedCharacters.value = [item.character]
  }
  sourceModalVisible.value = true
}

const closeSourceModal = () => {
  sourceModalVisible.value = false
  currentActiveItem.value = null
  sourceMatchedCharacters.value = []
}

// 2. 装备详情弹窗
const getEquipClasses = (classStr) => {
  if (!classStr) return []
  if (classStr === '全职') return ['通用']
  return classStr.split(/[\s,，]+/).filter(Boolean)
}

const modalTags = computed(() => {
  const equip = detailModal.value.data
  if (!equip) return { slot1: '', slot2: '', slot3: '', slot4: '' }

  const classes = getEquipClasses(equip.Class)
  let s1 = ''
  let s2 = ''
  let s3 = equip.Type || ''
  let s4 = ''

  if (classes.length === 1) {
    s4 = classes[0]
  } else if (classes.length === 2) {
    s4 = classes[0]
    s2 = classes[1]
  } else if (classes.length >= 3) {
    s4 = classes[0]
    s2 = classes[1]
    s1 = classes[2]
  }

  return { slot1: s1, slot2: s2, slot3: s3, slot4: s4 }
})

const getActiveAttributes = (item) => {
  if (!item) return []
  const active = []
  const upAttrs = item.UpgradeAttr ? item.UpgradeAttr.split(/[\s,，]+/).filter(Boolean) : []
  ATTRIBUTE_MAP.forEach(attr => {
    const base = item[attr.key] > 0
    const inUp = upAttrs.includes(attrNameToChinese[attr.key])
    if (base || inUp) {
      active.push(attr)
    }
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

const openDetail = (equip) => {
  selectedStar.value = 0
  selectedInherit.value = equip.Step === 'SS'
  expandedBonds.value = [false, false, false]
  detailModal.value = { visible: true, data: equip }
}

const closeDetail = () => {
  detailModal.value = { visible: false, data: {} }
}

const toggleBondExpand = (idx) => {
  expandedBonds.value[idx] = !expandedBonds.value[idx]
}

const toggleInherit = () => {
  if (detailModal.value.data.Step === 'SS') return
  selectedInherit.value = !selectedInherit.value
}

const handleIconError = (e) => {
  e.target.src = '/Header/M00000.png'
}
</script>

<style scoped>
/* =================== 全局容器与头部布局 =================== */
.talent-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  font-family: 'HarmonyOS Sans SC', sans-serif;
}

.talent-sticky-top {
  flex-shrink: 0;
  background: var(--bg);
}

.talent-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  flex-shrink: 0;
}

.sub-filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0 12px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  flex-shrink: 0;
  color: var(--text-main);
  height: 42px;
}
.sub-filter-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.sub-filter-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.dark-mode .sub-filter-btn.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #60a5fa;
}

.filter-toggle-text {
  font-size: 12px;
  font-weight: 600;
}

.collapse-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  transition: transform 0.2s ease;
}
.collapse-icon.collapsed {
  transform: rotate(180deg);
}

.sub-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 14px;
  margin-top: 10px;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
  width: 100%;
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

.talent-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  gap: 0;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
  flex: 1;
}

.talent-search-box:focus-within {
  border-color: #409eff;
}

.search-icon {
  width: 18px;
  height: 18px;
  filter: var(--icon-filter);
  margin-right: 10px;
  flex-shrink: 0;
  opacity: 0.7;
}

.talent-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-main);
  font-family: inherit;
}



.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.2s ease;
}
.slide-fade-enter-from, .slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ===== 分类 Tab 切换按键 ===== */
.tabs-section {
  margin-top: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 6px 12px;
}

.tabs-section.flex-col-layout {
  flex-direction: column;
  gap: 6px;
}

.tabs-group {
  display: flex;
  width: 100%;
  gap: 4px;
  background: var(--bg);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 6px 2px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-sub);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--text-main);
}

.tab-btn.active {
  background: var(--card-bg);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* =================== 效果标签筛选栏 =================== */
.effect-filter-bar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  box-sizing: border-box;
}

.effect-filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.effect-filter-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}

.effect-expand-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
}

.expand-text-hint {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-main);
    user-select: none;
}

.arrow-indicator {
  width: 12px;
  height: 12px;
  transition: transform 0.2s ease;
  filter: var(--icon-filter);
}

.arrow-indicator.rotated {
  transform: rotate(180deg);
}

.effect-tags-content {
  margin-top: 10px;
  border-top: 1px dashed var(--border-color);
  padding-top: 10px;
}

.tags-pool-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
  padding-right: 4px;
}

.effect-tag {
  font-size: 11.5px;
  padding: 5px 10px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  user-select: none;
  white-space: nowrap;
  word-break: keep-all;
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.effect-tag.active {
  background: rgba(249, 115, 22, 0.08);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 700;
}

.tag-close-x {
  font-size: 10px;
  opacity: 0.8;
}

/* =================== 列表与区块分栏 =================== */
.block-list-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 2px;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.search-count-bar {
  padding: 0px 12px 2px 12px;
  font-size: 12px;
  color: var(--text-main); 
  text-align: left;
  font-weight: 600;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.search-count-bar.all-tab {
  display: block;
}

.count-highlight {
  color: var(--primary);
  font-weight: 700;
}

.section-card {
  margin-bottom: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 4px 12px 4px;
  box-sizing: border-box;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 8px;
}

.section-dot {
  width: 4px;
  height: 12px;
  border-radius: 2px;
  display: inline-block;
}

.section-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

/* =================== 卡片基本通用样式 =================== */
.talent-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0;
  width: 100%;
}

.talent-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s, box-shadow 0.2s, transform 0.2s;
  flex-shrink: 0;
  box-sizing: border-box;
  text-align: left;
}

.talent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-light, rgba(249,115,22,0.25));
}

.talent-top-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 8px;
  min-height: 24px;
  height: auto;
  gap: 8px 4px;
}

.talent-char-avatar-container {
  width: 35px;
  height: 35px;
  border-radius: 8px;
  margin-right: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.talent-char-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  transform: scale(1.4) translateY(2px);
}

.talent-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  margin-right: 8px;
}

.skill-mini-box {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 8px;
  background: rgba(100, 116, 139, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-mini-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 标签与下拉 */
.talent-tag-dropdown-wrapper {
  position: relative;
  display: inline-block;
}

.talent-tag {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.tag-arrow-icon {
  width: 8px;
  height: 8px;
  transition: transform 0.15s ease;
  filter: var(--icon-filter);
}

.expanded-flip {
  transform: rotate(180deg);
}

.tag-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-top: 4px;
  padding: 4px 0;
  min-width: 60px;
}

.tag-dropdown-item {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
  text-align: center;
}

.tag-dropdown-item:hover {
  background: var(--bg);
}

/* 来源 */
.talent-source-wrapper {
  display: inline-flex;
  align-items: center;
  background: #fff7ed;
  color: #c2410c;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}
.talent-source-wrapper:hover {
  background: #ffedd5;
  transform: translateY(-1px);
}

.talent-source {
  font-size: 12px;
  font-weight: 500;
  color: inherit;
}

.source-expand-icon {
  width: 18px;
  height: 18px;
  margin-left: 4px;
  filter: var(--icon-filter);
  opacity: 0.8;
}

/* 描述效果 */
.talent-effect {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-main);
  white-space: pre-wrap;
  background: #f8faff;
  padding: 8px 10px;
  border-radius: 8px;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
  margin-top: 4px;
}
.dark-mode .talent-effect {
  background: rgba(30, 41, 59, 0.5);
}

.skill-specs {
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 8px;
  font-weight: 500;
  border-top: 1px dashed var(--border-color);
  padding-top: 8px;
  text-align: left;
}

/* =================== 装备详细卡片样式 =================== */
.equip-detail-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  box-sizing: border-box;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 8px;
}

.equip-detail-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.detail-row-first {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.detail-card-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.equip-detail-icon-slot {
  width: 35px;
  height: 35px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: rgba(100, 116, 139, 0.05);
}

.equip-detail-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.equip-detail-name {
  font-size: 14px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rare-equip-tag {
  font-size: 10px;
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fee2e2;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 700;
}

.detail-card-attributes {
  display: flex;
  gap: 4px;
}

.base-attr-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-main);
  background: var(--bg);
}

.attr-mini-icon {
  width: 12px;
  height: 12px;
  object-fit: contain;
}

.detail-row-bond {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
  margin-top: 6px;
}

.bond-meta-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.bond-title-text {
  font-size: 13px;
  font-weight: 600;
}

.bond-type-tag {
  font-size: 10px;
  background: rgba(100, 116, 139, 0.1);
  color: var(--text-sub);
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 700;
}

.bond-desc-line {
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.4;
}

/* =================== 弹窗遮罩及样式复刻 =================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 1. 角色绑定来源小弹窗 */
.modal-window {
  width: 90%;
  max-width: 420px;
  background: var(--card-bg);
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

.modal-close-x {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-sub);
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
  text-align: left;
}

.match-chars-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.matched-hero-card {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hero-name-span {
  font-size: 14.5px;
}

.wish-rarity-color-3 { color: #f97316 !important; font-weight: 600; }
.wish-rarity-color-2 { color: #a855f7 !important; font-weight: 600; }
.wish-rarity-color-1 { color: #10b981 !important; font-weight: 600; }
.wish-rarity-color-0 { color: #64748b !important; font-weight: 600; }

.hero-labels-container {
  display: flex;
  gap: 4px;
}

.h-lbl {
  font-size: 10.5px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.label-job {
  background: rgba(59,130,246,0.08);
  color: #3b82f6;
}
.label-race {
  background: rgba(168,85,247,0.08);
  color: #a855f7;
}
.label-attr {
  background: rgba(16,185,129,0.08);
  color: #10b981;
}

.matched-hero-none {
  font-size: 12px;
  color: var(--text-sub);
  padding: 10px;
  text-align: center;
}

/* 2. 装备详情大弹窗 */
.equip-detail-window {
  background: var(--card-bg);
  width: 90%;
  max-width: 360px;
  border-radius: 20px;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.equip-modal-header {
  padding: 16px 20px;
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
  font-size: 18px;
  font-weight: 800;
  text-align: center;
  pointer-events: none;
  z-index: 1;
}

.relic-modal-close {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.15s;
  z-index: 2;
}
.relic-modal-close:hover {
  color: #ef4444;
}

.equip-modal-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 75vh;
  overflow-y: auto;
  text-align: left;
}

.modal-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 10px;
  box-sizing: border-box;
}

.modal-stars-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 96px;
  flex-shrink: 0;
}

.star-row {
  display: flex;
  gap: 4px;
}

.modal-star-tag {
  flex: 1;
  padding: 3px 0;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  color: var(--text-sub);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  white-space: nowrap;
}

@media (hover: hover) {
  .modal-star-tag:hover {
    color: var(--text-main);
    border-color: #94a3b8;
  }
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
  width: 72px;
  height: 72px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  box-sizing: border-box;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
}

.relic-detail-img {
  width: 90%;
  height: 90%;
  object-fit: contain;
}

.modal-tags-right {
  display: grid;
  grid-template-columns: repeat(2, 46px);
  grid-template-rows: repeat(2, 22px);
  gap: 6px 6px;
  width: 98px;
  flex-shrink: 0;
}

.modal-info-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 6px;
  white-space: nowrap;
  box-sizing: border-box;
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
  font-size: 11.5px;
  color: #000000;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 12px;
  line-height: 1.4;
  text-align: center;
  margin-bottom: 2px;
}

.modal-attributes-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  width: 100%;
}

.attribute-cell-box {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  height: 32px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-sizing: border-box;
  padding: 0 4px;
}

.attr-grid-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.attr-grid-val {
  font-size: 11px;
  font-weight: 800;
  color: var(--text-main);
}

.modal-bonds-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.bond-detail-item-box {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bond-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding-bottom: 2px;
}

.bond-item-name {
  font-size: 13.5px;
  font-weight: 800;
  color: #000000;
}
.dark-mode .bond-item-name {
  color: #ffffff;
}

.bond-item-type {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-sub);
  background: var(--border-color);
  padding: 1px 4px;
  border-radius: 4px;
}

.bond-item-basic-desc {
  font-size: 13px;
  color: #000000;
  line-height: 1.4;
}
.dark-mode .bond-item-basic-desc {
  color: #ffffff;
}

.bond-item-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bond-collapse-icon {
  width: 10px;
  height: 10px;
  filter: var(--icon-filter);
  transition: transform 0.25s ease;
}
.bond-collapse-icon.collapsed {
  transform: rotate(180deg);
}

/* 可折叠展开列表 */
.bond-expanded-list {
  margin-top: 6px;
  border-top: 1px dashed #cbd5e1;
  padding-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.dark-mode .bond-expanded-list {
  border-top: 1px dashed var(--border-color);
}

.expanded-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px;
  border-bottom: 1px dashed #cbd5e1;
  font-size: 13px;
  line-height: 1.4;
  color: #000000;
  transition: all 0.15s;
}
.expanded-row:last-child {
  border-bottom: none;
}
.dark-mode .expanded-row {
  color: #ffffff;
  border-bottom: 1px dashed var(--border-color);
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

/* 获取地图 */
.modal-source-section {
  display: flex;
  align-items: center;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px;
  box-sizing: border-box;
  width: 100%;
}

.source-header-label {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-sub);
}

.source-content-text {
  font-size: 13px;
  color: #000000;
  font-weight: 600;
}
.dark-mode .source-content-text {
  color: #ffffff;
}

/* =================== 其他动画与微型样式 =================== */
.no-data, .loading-spinner, .no-more-data {
  font-size: 12px;
  color: var(--text-sub);
  text-align: center;
  padding: 10px;
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.load-more-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 0;
  color: var(--text-sub);
  font-size: 12px;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dark-mode .tag-dropdown-menu {
  background: #1e293b;
  border-color: #334155;
}

.dark-mode .modal-star-tag {
  background: #1e293b;
}
.dark-mode .talent-source-wrapper {
  background: rgba(251, 146, 60, 0.15);
  color: #ffedd5;
  border: 1px solid rgba(251, 146, 60, 0.3);
}

img.game-sprite {
  /* 核心：告诉浏览器使用最近邻算法放大图片，保持像素锐利 */
  image-rendering: pixelated;
  
  /* 为了兼容旧版本浏览器或特定内核（如老版本 Firefox 或 Safari） */
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* ================= 筛选条样式 ================= */
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

.sorting-group {
  display: flex;
  gap: 4px;
  background: var(--bg);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.sort-btn {
  min-width: 80px;
  padding: 3px 12px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: var(--text-sub);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}
.sort-btn:hover {
  color: var(--text-main);
}
.sort-btn.active {
  background: var(--card-bg);
  color: var(--primary);
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

@media (min-width: 601px) {
  /* 弹窗整体拉大 */
  .equip-detail-window {
    max-width: 480px !important;
  }

  /* 标题与关闭按钮字号加大 */
  .centered-modal-title {
    font-size: 22px !important;
  }
  .relic-modal-close {
    font-size: 22px !important;
  }

  /* 顶部三栏排布与内容放大 */
  .modal-top-row {
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 14px !important;
  }
  .modal-stars-left {
    width: 110px !important;
    gap: 8px !important;
  }
  .modal-star-tag {
    padding: 5px 0 !important;
    font-size: 13px !important;
  }
  
  /* 中间的图变得更大 */
  .modal-icon-center {
    width: 104px !important;
    height: 104px !important;
    border-radius: 16px !important;
    padding: 8px !important;
  }
  
  .modal-tags-right {
    width: 122px !important;
    grid-template-columns: repeat(2, 58px) !important;
    grid-template-rows: repeat(2, 28px) !important;
    gap: 8px !important;
  }
  .modal-info-tag {
    font-size: 13px !important;
    border-radius: 8px !important;
  }

  /* 描述行与属性行字号及内边距放大 */
  .modal-description-row {
    font-size: 14px !important;
    padding: 12px 16px !important;
    border-radius: 12px !important;
  }
  .attribute-cell-box {
    height: 38px !important;
    border-radius: 10px !important;
    gap: 6px !important;
  }
  .attr-grid-icon {
    width: 16px !important;
    height: 16px !important;
  }
  .attr-grid-val {
    font-size: 13px !important;
  }

  /* 词条详细与来源部分字号及内边距放大 */
  .bond-detail-item-box {
    padding: 12px 16px !important;
    border-radius: 14px !important;
    gap: 4px !important;
  }
  .bond-item-name {
    font-size: 16px !important;
  }
  .bond-item-type {
    font-size: 13px !important;
  }
  .bond-item-basic-desc {
    font-size: 15px !important;
    line-height: 1.5 !important;
  }
  .expanded-row {
    font-size: 15px !important;
    padding: 8px 10px !important;
    line-height: 1.5 !important;
  }
  .bond-collapse-icon {
    width: 12px !important;
    height: 12px !important;
  }
  .modal-source-section {
    padding: 12px 16px !important;
    font-size: 15px !important;
    border-radius: 14px !important;
  }
}

/* 分类标签样式 */
.categorized-effect-tags {
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
}

.tag-group-header {
  margin: 8px 0 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--text-sub, #64748b);
  display: flex;
  align-items: center;
  gap: 6px;
}
.tag-group-header::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 12px;
  background: var(--text-sub, #64748b);
  border-radius: 2px;
}

.effect-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

/* ====== 加载状态样式 ====== */
.global-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  width: 100%;
  gap: 12px;
  color: var(--text-sub, #64748b);
  font-size: 14px;
}

.global-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(64, 158, 255, 0.2);
  border-top-color: #409eff;
  border-radius: 50%;
  animation: global-spin 0.8s linear infinite;
}

@keyframes global-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
