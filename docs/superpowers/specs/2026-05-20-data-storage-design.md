# 数据存储层设计

Date: 2026-05-20

## 目标

为 `dr_asif_v21_app.jsx` 增加本地持久化能力，采用适配器模式，最小化对现有组件代码的修改。后续可扩展为云同步和备份/恢复。

## 架构

```
Components (useGender(null) / useStreak([false]*7) ...)
       ↓
   useStorage(key, defaultValue)   ← 适配器层，签名同 useState
       ↓
 StorageService.save(key, data)     ← 未来云同步只需改这里
       ↓
  localStorage (当前实现)
```

## 核心文件

### `src/services/storage.js` — 单一模块文件

```js
// 文件路径
src/services/storage.js

// 包含内容
1. STORAGE_KEYS 常量 — Key 注册表，供审查和迁移用
2. StorageService — localStorage 读写服务（未来云同步的接口层）
3. useStorage — 适配器 Hook，签名同 useState
4. 领域专属 Hook 集合 — useGender, useUserProfile, useStreak, ...

// 职责
- localStorage 读写（JSON 序列化）
- exportAll() / importAll(json) / clearAll()
- 未来云同步的接口层

// 不做
- 不做数据校验
- 不做业务逻辑
```

### Key 注册表

```js
// 位于 src/services/storage.js 内

const STORAGE_KEYS = {
  user: {
    gender:  'user.gender',
    profile: 'user.profile',
  },
  streak: {
    weekly: 'streak.weekly',
  },
  calories: {
    food:     'calories.food',
    exercise: 'calories.exercise',
  },
  challenge: {
    phase:   'challenge.phase',
    started: 'challenge.started',
    checked: 'challenge.checked',
  },
  track: {
    entries: 'track.entries',
  },
  coach: {
    messages: 'coach.messages',
  },
  community: {
    liked: 'community.liked',
  },
};
```

### 领域专属 Hook 集合（位于 storage.js 内）

```js
// 每个 hook 签名完全对齐 useState(defaultValue)
// 不传 key，key 在 hook 内部绑定

useGender(defaultValue)          → key: 'user.gender'
useUserProfile(defaultValue)      → key: 'user.profile'
useStreak(defaultValue)           → key: 'streak.weekly'
useCaloriesFood(defaultValue)     → key: 'calories.food'
useCaloriesExercise(defaultValue) → key: 'calories.exercise'
useChallengePhase(defaultValue)  → key: 'challenge.phase'
useChallengeStarted(defaultValue)→ key: 'challenge.started'
useChallengeChecked(defaultValue)→ key: 'challenge.checked'
useTrackEntries(defaultValue)    → key: 'track.entries'
useCoachMessages(defaultValue)   → key: 'coach.messages'
useCommunityLiked(defaultValue)   → key: 'community.liked'
```

## 需要持久化的数据

| 数据 | 默认值 | 所在组件 |
|-----|-------|---------|
| `gender` | `null` | App |
| `userProfile` | `null` | App |
| `streak` | `Array(7).fill(false)` | App → HomeTab |
| `food` | `[]` | CaloriesTab |
| `ex` (exercise) | `[]` | CaloriesTab |
| `phase` | `"week3"` | ChallengeTab |
| `started` | `false` | ChallengeTab |
| `checked` | `{}` | ChallengeTab |
| `entries` | `[]` | TrackTab |
| `msgs` | `[{role:"assistant",...}]` | CoachTab |
| `liked` | `reviews.map(()=>false)` | CommunityTab |

**不需要持久化的数据**（UI 状态，无需修改）：
- `toast`、`loading`、`scanning`、`modal` 等
- `active`、`settings`、`more` 等 App 导航状态
- 表单临时输入（`nm`、`nk`、`w` 等）

## 迁移步骤

每个需要持久化的 state，替换规则：

```jsx
// 之前
const [gender, setGender] = useState(null);

// 之后
const [gender, setGender] = useGender(null);
```

只需改这一行，`setGender` 的所有调用方式完全不变。

## 导出/备份接口（StorageService）

```js
StorageService.save(key, data)      // 内部封装 JSON.stringify
StorageService.load(key)            // 内部封装 JSON.parse + 错误处理
StorageService.exportAll()          // → { user: {...}, streak: {...}, ... }
StorageService.importAll(json)       // 批量写入 localStorage
StorageService.clearAll()           // 清除所有持久化数据
```

## 实现顺序

1. `src/services/storage.js` — StorageService 本地实现
2. `src/hooks/useStorage.js` — useStorage Hook
3. `src/hooks/useStorageHooks.js` — 所有领域 Hook
4. `src/constants/STORAGE_KEYS.js` — Key 注册表
5. 修改 `dr_asif_v21_app.jsx` — 逐个替换需要持久化的 state

## 注意事项

- 组件内部不需要知道任何 key 的值
- 不做数据迁移逻辑（key 变了才需要）
- CoachTab 的 `msgs` 默认值依赖外部变量 `plan`，需要传函数式默认值
- CommunityTab 的 `liked` 默认值依赖 `reviews.map(()=>false)`，同样需要函数式默认值