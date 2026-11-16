import { useEffect, useState } from 'react'

type ApiData<T> = { data: T | null; error: Error | null; loading: boolean }

/**
 * 화면이 열릴 때 API 함수로 데이터를 받는다. 모든 화면이 같은 방식으로 불러오도록 이 훅을 쓴다.
 * 예: const { data: notices } = useApiData(() => getNotifications(), [])
 */
export function useApiData<T>(load: () => Promise<T>, deps: unknown[]): ApiData<T> {
  const [state, setState] = useState<ApiData<T>>({ data: null, error: null, loading: true })

  useEffect(() => {
    // 화면을 떠난 뒤 늦게 온 응답으로 상태를 바꾸지 않는다
    let isCurrent = true
    setState(previous => ({ ...previous, loading: true }))
    load()
      .then(data => isCurrent && setState({ data, error: null, loading: false }))
      .catch((error: Error) => isCurrent && setState({ data: null, error, loading: false }))
    return () => { isCurrent = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 호출하는 쪽이 deps로 다시 불러올 때를 정한다
  }, deps)

  return state
}
