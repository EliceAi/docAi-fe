import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  // 휴대폰 브라우저는 https가 아니면 카메라를 막는다. `npm run dev:phone`일 때만 https로 같은 와이파이에 연다.
  const isPhoneTest = mode === 'phone'

  return {
    plugins: [react(), isPhoneTest && basicSsl()],
    server: {
      host: isPhoneTest,
      // 백엔드에 CORS 설정이 없어서, 브라우저는 같은 주소의 /api로 부르고 Vite가 백엔드로 넘긴다.
      proxy: {
        '/api': 'http://localhost:8080',
      },
    },
  }
})
