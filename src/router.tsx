import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from './pages/home/HomePage'

// 앱의 모든 화면 주소는 이 파일 한 곳에 둔다. 나머지 화면 주소는 #5에서 미리 등록한다.
export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
])
