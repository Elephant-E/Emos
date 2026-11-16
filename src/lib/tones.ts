/** 状态色调词表：Badge 与 format 里的状态映射共用，不放在组件层（避免 lib → components 反向依赖） */
export type BadgeTone = 'ok' | 'wait' | 'run' | 'warn' | 'off' | 'danger'
