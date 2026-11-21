import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// npm run dev를 켜면 앱 주소 아래에 보드 모아 보기 주소도 같이 보여 준다. 따로 알려 주지 않아도 찾을 수 있게.
function printBoardsUrl(): Plugin {
  return {
    name: 'print-boards-url',
    configureServer(server) {
      const printUrls = server.printUrls.bind(server)
      server.printUrls = () => {
        printUrls()
        const appUrl = server.resolvedUrls?.local[0]
        if (appUrl) server.config.logger.info(`  ➜  보드 모아 보기: ${appUrl}dev/boards`)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  // 휴대폰 브라우저는 https가 아니면 카메라를 막는다. `npm run dev:phone`일 때만 https로 같은 와이파이에 연다.
  const isPhoneTest = mode === 'phone'

  return {
    plugins: [react(), printBoardsUrl(), isPhoneTest && basicSsl()],
    server: {
      host: isPhoneTest,
      // 백엔드에 CORS 설정이 없어서, 브라우저는 같은 주소의 /api로 부르고 Vite가 백엔드로 넘긴다.
      proxy: {
        '/api': 'http://localhost:8080',
      },
    },
  }
})
