# 音乐模块代码审查与修复清单

## 严重问题

### 1. 字段名错误（跨多文件）
| 代码中使用 | API 实际返回 | 影响文件 |
|-----------|-------------|---------|
| `artist.id` | `person_id` | MusicDetailView, MusicArtistDetailView, MusicAlbumDetailView, MediaView |
| `artist.image_profile` | `image_profile_url` | MediaView |
| `media.file_duration` | `file_second` | MusicDetailView |

### 2. 未调用真实 API
| 功能 | 文件 | 现状 |
|------|------|------|
| 删除歌词 | MusicDetailView | 仅本地删除，未调 musicApi.deleteLyric() |
| 创建歌词 | MusicDetailView | 模拟延迟+伪造数据，未调 musicApi.createLyric() |
| 删除歌曲 | MusicAlbumDetailView | 仅本地删除，musicApi.deleteSong() 不存在 |

### 3. catch 吞掉错误无用户提示
- player.js: playSong, _playWithMedia, playRandom
- MediaView: playArtistSong, playAlbumSong
- MusicArtistDetailView: playAlbumSong

## 高优先级

### 4. musicApi 缺失方法
- `deleteSong(songId)`: DELETE /api/music/song/{id}/delete

### 5. MusicAlbumDetailView.albumTypeMusicLabel 标签错误
- `'歌（单曲）曲'` → `'单曲'`，`'歌（EP）曲'` → `'EP'`，`'歌（专辑）曲'` → `'专辑'`

## 中优先级

### 6. 内存泄漏
- MusicDetailView: moveSearchTimer 未在 onUnmounted 清理

### 7. UI 问题
- Sidebar: 播放器显示条件 `v-if="player.currentSong || !player.playUrl"` 永远为 true
- TopBar: v-if 与 CSS transition 冲突，退出动画不生效

## 修复清单

- [ ] 1. 修复所有 `artist.id` → `artist.person_id`
- [ ] 2. 修复 `artist.image_profile` → `artist.image_profile_url`
- [ ] 3. 修复 `media.file_duration` → `media.file_second`
- [ ] 4. musicApi 添加 deleteSong 方法
- [ ] 5. MusicDetailView deleteLyric 调用真实 API
- [ ] 6. MusicDetailView saveLyric 调用真实 API
- [ ] 7. MusicAlbumDetailView deleteSong 调用真实 API
- [ ] 8. MusicAlbumDetailView albumTypeMusicLabel 修复
- [ ] 9. player.js catch 添加 toast 错误提示
- [ ] 10. player.js togglePlay 添加 try/catch
- [ ] 11. MediaView playArtistSong/playAlbumSong catch 添加 toast
- [ ] 12. MusicArtistDetailView playAlbumSong catch 添加 toast
- [ ] 13. MusicDetailView moveSearchTimer onUnmounted 清理
- [ ] 14. Sidebar 播放器显示条件简化
- [ ] 15. TopBar v-if→v-show 修复退出动画