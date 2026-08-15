// vite.config.ts
import { defineConfig } from "file:///Users/elephant/Documents/emos/emos-vue/node_modules/vite/dist/node/index.js";
import vue from "file:///Users/elephant/Documents/emos/emos-vue/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { fileURLToPath, URL } from "node:url";
var __vite_injected_original_import_meta_url = "file:///Users/elephant/Documents/emos/emos-vue/vite.config.ts";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    {
      name: "login-rewrite",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url === "/login" || req.url.startsWith("/login?"))) {
            req.url = req.url.replace("/login", "/login.html");
          }
          next();
        });
      }
    },
    {
      name: "video-identify-api",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === "/api/video/identify" && req.method === "POST") {
            try {
              const chunks = [];
              for await (const chunk of req) {
                chunks.push(chunk);
              }
              const body = JSON.parse(Buffer.concat(chunks).toString());
              const filename = body.filename;
              if (!filename) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: false, message: "\u6587\u4EF6\u540D\u4E0D\u80FD\u4E3A\u7A7A" }));
                return;
              }
              const guessitUrl = `https://elephant.pythonanywhere.com/?filename=${encodeURIComponent(filename)}`;
              const guessitResponse = await fetch(guessitUrl);
              const guessitResult = await guessitResponse.json();
              if (!guessitResult.title) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: false, message: guessitResult.message || "\u65E0\u6CD5\u4ECE\u6587\u4EF6\u540D\u89E3\u6790\u51FA\u6807\u9898" }));
                return;
              }
              const guessitTitle = guessitResult.title;
              const isMovie = guessitResult.type === "movie";
              const season = guessitResult.season || null;
              const episode = guessitResult.episode || null;
              const tmdbApiKey = "REDACTED_TMDB";
              const tmdbType = isMovie ? "movie" : "tv";
              const tmdbUrl = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(guessitTitle)}&api_key=${tmdbApiKey}&language=zh-CN`;
              const tmdbResponse = await fetch(tmdbUrl);
              const tmdbData = await tmdbResponse.json();
              if (!tmdbData.results || tmdbData.results.length === 0) {
                res.statusCode = 404;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: false, message: `\u672A\u627E\u5230\u5339\u914D\u7684\u89C6\u9891: ${guessitTitle}` }));
                return;
              }
              const tmdbId = tmdbData.results[0].id;
              const getVideoIdParams = new URLSearchParams({
                video_id_type: "tmdb",
                video_id_value: String(tmdbId),
                tmdb_type: tmdbType
              });
              if (!isMovie && season) {
                getVideoIdParams.set("season_number", String(season));
              }
              if (!isMovie && episode) {
                getVideoIdParams.set("episode_number", String(episode));
              }
              const getVideoIdUrl = `https://emos.best/api/video/getVideoId?${getVideoIdParams.toString()}`;
              const authHeader = req.headers["authorization"] || req.headers["Authorization"];
              const emosHeaders = {};
              if (authHeader) {
                emosHeaders["Authorization"] = authHeader;
              }
              const videoIdResponse = await fetch(getVideoIdUrl, { headers: emosHeaders });
              const videoIdResult = await videoIdResponse.json();
              if (videoIdResult.success === false) {
                res.statusCode = 404;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: false, message: videoIdResult.message || "EMOS \u67E5\u8BE2\u5931\u8D25" }));
                return;
              }
              let itemType, itemId, displayTitle;
              if (isMovie) {
                itemType = videoIdResult.item_type;
                itemId = videoIdResult.item_id;
                displayTitle = videoIdResult.video_title || guessitTitle;
              } else {
                if (episode && videoIdResult.episode_info) {
                  itemType = videoIdResult.episode_info.item_type;
                  itemId = videoIdResult.episode_info.item_id;
                  displayTitle = `${videoIdResult.video_title} \u2022 S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
                } else if (season && videoIdResult.season_info) {
                  itemType = videoIdResult.season_info.item_type;
                  itemId = videoIdResult.season_info.item_id;
                  displayTitle = `${videoIdResult.video_title} \u2022 S${String(season).padStart(2, "0")}`;
                } else {
                  itemType = videoIdResult.item_type;
                  itemId = videoIdResult.item_id;
                  displayTitle = videoIdResult.video_title || guessitTitle;
                }
              }
              if (!itemType || !itemId) {
                res.statusCode = 404;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: false, message: "EMOS \u4E2D\u672A\u627E\u5230\u8BE5\u89C6\u9891" }));
                return;
              }
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                success: true,
                item_type: itemType,
                item_id: itemId,
                title: displayTitle,
                season,
                episode
              }));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, message: error.message || "\u8BC6\u522B\u5931\u8D25" }));
            }
            return;
          }
          next();
        });
      }
    }
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    open: true,
    proxy: {
      "/api": {
        target: "https://emos.best",
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", __vite_injected_original_import_meta_url)),
        login: fileURLToPath(new URL("./public/login.html", __vite_injected_original_import_meta_url))
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZWxlcGhhbnQvRG9jdW1lbnRzL2Vtb3MvZW1vcy12dWVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9lbGVwaGFudC9Eb2N1bWVudHMvZW1vcy9lbW9zLXZ1ZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZWxlcGhhbnQvRG9jdW1lbnRzL2Vtb3MvZW1vcy12dWUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tICdub2RlOnVybCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHZ1ZSgpLFxuICAgIHtcbiAgICAgIG5hbWU6ICdsb2dpbi1yZXdyaXRlJyxcbiAgICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgocmVxOiBhbnksIHJlczogYW55LCBuZXh0OiBhbnkpID0+IHtcbiAgICAgICAgICBpZiAocmVxLnVybCAmJiAocmVxLnVybCA9PT0gJy9sb2dpbicgfHwgcmVxLnVybC5zdGFydHNXaXRoKCcvbG9naW4/JykpKSB7XG4gICAgICAgICAgICByZXEudXJsID0gcmVxLnVybC5yZXBsYWNlKCcvbG9naW4nLCAnL2xvZ2luLmh0bWwnKVxuICAgICAgICAgIH1cbiAgICAgICAgICBuZXh0KClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6ICd2aWRlby1pZGVudGlmeS1hcGknLFxuICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKGFzeW5jIChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChyZXEudXJsID09PSAnL2FwaS92aWRlby9pZGVudGlmeScgJiYgcmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW11cbiAgICAgICAgICAgICAgZm9yIGF3YWl0IChjb25zdCBjaHVuayBvZiByZXEpIHtcbiAgICAgICAgICAgICAgICBjaHVua3MucHVzaChjaHVuaylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSlcbiAgICAgICAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBib2R5LmZpbGVuYW1lXG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDBcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiAnXHU2NTg3XHU0RUY2XHU1NDBEXHU0RTBEXHU4MEZEXHU0RTNBXHU3QTdBJyB9KSlcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gU3RlcCAxOiBHdWVzc2l0XG4gICAgICAgICAgICAgIGNvbnN0IGd1ZXNzaXRVcmwgPSBgaHR0cHM6Ly9lbGVwaGFudC5weXRob25hbnl3aGVyZS5jb20vP2ZpbGVuYW1lPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gXG4gICAgICAgICAgICAgIGNvbnN0IGd1ZXNzaXRSZXNwb25zZSA9IGF3YWl0IGZldGNoKGd1ZXNzaXRVcmwpXG4gICAgICAgICAgICAgIGNvbnN0IGd1ZXNzaXRSZXN1bHQgPSBhd2FpdCBndWVzc2l0UmVzcG9uc2UuanNvbigpXG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZiAoIWd1ZXNzaXRSZXN1bHQudGl0bGUpIHtcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMFxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJylcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IGd1ZXNzaXRSZXN1bHQubWVzc2FnZSB8fCAnXHU2NUUwXHU2Q0Q1XHU0RUNFXHU2NTg3XHU0RUY2XHU1NDBEXHU4OUUzXHU2NzkwXHU1MUZBXHU2ODA3XHU5ODk4JyB9KSlcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY29uc3QgZ3Vlc3NpdFRpdGxlID0gZ3Vlc3NpdFJlc3VsdC50aXRsZVxuICAgICAgICAgICAgICBjb25zdCBpc01vdmllID0gZ3Vlc3NpdFJlc3VsdC50eXBlID09PSAnbW92aWUnXG4gICAgICAgICAgICAgIGNvbnN0IHNlYXNvbiA9IGd1ZXNzaXRSZXN1bHQuc2Vhc29uIHx8IG51bGxcbiAgICAgICAgICAgICAgY29uc3QgZXBpc29kZSA9IGd1ZXNzaXRSZXN1bHQuZXBpc29kZSB8fCBudWxsXG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBTdGVwIDI6IFRNREJcbiAgICAgICAgICAgICAgY29uc3QgdG1kYkFwaUtleSA9ICcxNDEzYjgzM2QyZWFhMDQ0YTJhMDY3MTYxMWUwODNjOCdcbiAgICAgICAgICAgICAgY29uc3QgdG1kYlR5cGUgPSBpc01vdmllID8gJ21vdmllJyA6ICd0didcbiAgICAgICAgICAgICAgY29uc3QgdG1kYlVybCA9IGBodHRwczovL2FwaS50aGVtb3ZpZWRiLm9yZy8zL3NlYXJjaC8ke3RtZGJUeXBlfT9xdWVyeT0ke2VuY29kZVVSSUNvbXBvbmVudChndWVzc2l0VGl0bGUpfSZhcGlfa2V5PSR7dG1kYkFwaUtleX0mbGFuZ3VhZ2U9emgtQ05gXG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBjb25zdCB0bWRiUmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh0bWRiVXJsKVxuICAgICAgICAgICAgICBjb25zdCB0bWRiRGF0YSA9IGF3YWl0IHRtZGJSZXNwb25zZS5qc29uKClcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGlmICghdG1kYkRhdGEucmVzdWx0cyB8fCB0bWRiRGF0YS5yZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0XG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogYFx1NjcyQVx1NjI3RVx1NTIzMFx1NTMzOVx1OTE0RFx1NzY4NFx1ODlDNlx1OTg5MTogJHtndWVzc2l0VGl0bGV9YCB9KSlcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY29uc3QgdG1kYklkID0gdG1kYkRhdGEucmVzdWx0c1swXS5pZFxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gU3RlcCAzOiBFTU9TIGdldFZpZGVvSWRcbiAgICAgICAgICAgICAgY29uc3QgZ2V0VmlkZW9JZFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xuICAgICAgICAgICAgICAgIHZpZGVvX2lkX3R5cGU6ICd0bWRiJyxcbiAgICAgICAgICAgICAgICB2aWRlb19pZF92YWx1ZTogU3RyaW5nKHRtZGJJZCksXG4gICAgICAgICAgICAgICAgdG1kYl90eXBlOiB0bWRiVHlwZVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgaWYgKCFpc01vdmllICYmIHNlYXNvbikge1xuICAgICAgICAgICAgICAgIGdldFZpZGVvSWRQYXJhbXMuc2V0KCdzZWFzb25fbnVtYmVyJywgU3RyaW5nKHNlYXNvbikpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKCFpc01vdmllICYmIGVwaXNvZGUpIHtcbiAgICAgICAgICAgICAgICBnZXRWaWRlb0lkUGFyYW1zLnNldCgnZXBpc29kZV9udW1iZXInLCBTdHJpbmcoZXBpc29kZSkpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGNvbnN0IGdldFZpZGVvSWRVcmwgPSBgaHR0cHM6Ly9lbW9zLmJlc3QvYXBpL3ZpZGVvL2dldFZpZGVvSWQ/JHtnZXRWaWRlb0lkUGFyYW1zLnRvU3RyaW5nKCl9YFxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY29uc3QgYXV0aEhlYWRlciA9IHJlcS5oZWFkZXJzWydhdXRob3JpemF0aW9uJ10gfHwgcmVxLmhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXVxuICAgICAgICAgICAgICBjb25zdCBlbW9zSGVhZGVyczogSGVhZGVyc0luaXQgPSB7fVxuICAgICAgICAgICAgICBpZiAoYXV0aEhlYWRlcikge1xuICAgICAgICAgICAgICAgIGVtb3NIZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBhdXRoSGVhZGVyXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGNvbnN0IHZpZGVvSWRSZXNwb25zZSA9IGF3YWl0IGZldGNoKGdldFZpZGVvSWRVcmwsIHsgaGVhZGVyczogZW1vc0hlYWRlcnMgfSlcbiAgICAgICAgICAgICAgY29uc3QgdmlkZW9JZFJlc3VsdCA9IGF3YWl0IHZpZGVvSWRSZXNwb25zZS5qc29uKClcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGlmICh2aWRlb0lkUmVzdWx0LnN1Y2Nlc3MgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDRcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiB2aWRlb0lkUmVzdWx0Lm1lc3NhZ2UgfHwgJ0VNT1MgXHU2N0U1XHU4QkUyXHU1OTMxXHU4RDI1JyB9KSlcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgbGV0IGl0ZW1UeXBlLCBpdGVtSWQsIGRpc3BsYXlUaXRsZVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgaWYgKGlzTW92aWUpIHtcbiAgICAgICAgICAgICAgICBpdGVtVHlwZSA9IHZpZGVvSWRSZXN1bHQuaXRlbV90eXBlXG4gICAgICAgICAgICAgICAgaXRlbUlkID0gdmlkZW9JZFJlc3VsdC5pdGVtX2lkXG4gICAgICAgICAgICAgICAgZGlzcGxheVRpdGxlID0gdmlkZW9JZFJlc3VsdC52aWRlb190aXRsZSB8fCBndWVzc2l0VGl0bGVcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZXBpc29kZSAmJiB2aWRlb0lkUmVzdWx0LmVwaXNvZGVfaW5mbykge1xuICAgICAgICAgICAgICAgICAgaXRlbVR5cGUgPSB2aWRlb0lkUmVzdWx0LmVwaXNvZGVfaW5mby5pdGVtX3R5cGVcbiAgICAgICAgICAgICAgICAgIGl0ZW1JZCA9IHZpZGVvSWRSZXN1bHQuZXBpc29kZV9pbmZvLml0ZW1faWRcbiAgICAgICAgICAgICAgICAgIGRpc3BsYXlUaXRsZSA9IGAke3ZpZGVvSWRSZXN1bHQudmlkZW9fdGl0bGV9IFx1MjAyMiBTJHtTdHJpbmcoc2Vhc29uKS5wYWRTdGFydCgyLCAnMCcpfUUke1N0cmluZyhlcGlzb2RlKS5wYWRTdGFydCgyLCAnMCcpfWBcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNlYXNvbiAmJiB2aWRlb0lkUmVzdWx0LnNlYXNvbl9pbmZvKSB7XG4gICAgICAgICAgICAgICAgICBpdGVtVHlwZSA9IHZpZGVvSWRSZXN1bHQuc2Vhc29uX2luZm8uaXRlbV90eXBlXG4gICAgICAgICAgICAgICAgICBpdGVtSWQgPSB2aWRlb0lkUmVzdWx0LnNlYXNvbl9pbmZvLml0ZW1faWRcbiAgICAgICAgICAgICAgICAgIGRpc3BsYXlUaXRsZSA9IGAke3ZpZGVvSWRSZXN1bHQudmlkZW9fdGl0bGV9IFx1MjAyMiBTJHtTdHJpbmcoc2Vhc29uKS5wYWRTdGFydCgyLCAnMCcpfWBcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgaXRlbVR5cGUgPSB2aWRlb0lkUmVzdWx0Lml0ZW1fdHlwZVxuICAgICAgICAgICAgICAgICAgaXRlbUlkID0gdmlkZW9JZFJlc3VsdC5pdGVtX2lkXG4gICAgICAgICAgICAgICAgICBkaXNwbGF5VGl0bGUgPSB2aWRlb0lkUmVzdWx0LnZpZGVvX3RpdGxlIHx8IGd1ZXNzaXRUaXRsZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgaWYgKCFpdGVtVHlwZSB8fCAhaXRlbUlkKSB7XG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDRcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiAnRU1PUyBcdTRFMkRcdTY3MkFcdTYyN0VcdTUyMzBcdThCRTVcdTg5QzZcdTk4OTEnIH0pKVxuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMFxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgaXRlbV90eXBlOiBpdGVtVHlwZSxcbiAgICAgICAgICAgICAgICBpdGVtX2lkOiBpdGVtSWQsXG4gICAgICAgICAgICAgICAgdGl0bGU6IGRpc3BsYXlUaXRsZSxcbiAgICAgICAgICAgICAgICBzZWFzb246IHNlYXNvbixcbiAgICAgICAgICAgICAgICBlcGlzb2RlOiBlcGlzb2RlXG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMFxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB8fCAnXHU4QkM2XHU1MjJCXHU1OTMxXHU4RDI1JyB9KSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cbiAgICAgICAgICBuZXh0KClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICBwb3J0OiA1MTczLFxuICAgIG9wZW46IHRydWUsXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2Vtb3MuYmVzdCcsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMnLCBpbXBvcnQubWV0YS51cmwpKVxuICAgIH1cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBpbnB1dDoge1xuICAgICAgICBtYWluOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vaW5kZXguaHRtbCcsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICAgICBsb2dpbjogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3B1YmxpYy9sb2dpbi5odG1sJywgaW1wb3J0Lm1ldGEudXJsKSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXVTLFNBQVMsb0JBQW9CO0FBQ3BVLE9BQU8sU0FBUztBQUNoQixTQUFTLGVBQWUsV0FBVztBQUZtSixJQUFNLDJDQUEyQztBQUl2TyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxJQUFJO0FBQUEsSUFDSjtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sZ0JBQWdCLFFBQVE7QUFDdEIsZUFBTyxZQUFZLElBQUksQ0FBQyxLQUFVLEtBQVUsU0FBYztBQUN4RCxjQUFJLElBQUksUUFBUSxJQUFJLFFBQVEsWUFBWSxJQUFJLElBQUksV0FBVyxTQUFTLElBQUk7QUFDdEUsZ0JBQUks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
