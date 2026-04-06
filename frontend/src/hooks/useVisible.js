import { useState, useEffect, useRef } from "react"

export function useVisible(rootMargin) {
  var margin = rootMargin || "300px"
  var ref = useRef(null)
  var [visible, setVisible] = useState(false)

  useEffect(function() {
    if (!ref.current) return
    var observer = new IntersectionObserver(
      function(entries) {
        if (entries[0].isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: margin }
    )
    observer.observe(ref.current)
    return function() { observer.disconnect() }
  }, [margin])

  return [ref, visible]
}