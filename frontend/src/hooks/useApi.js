import { useState, useEffect, useRef } from "react"
import axios from "axios"

const BASE = import.meta.env.VITE_API_URL || ""

// Module-level cache keyed by endpoint + sorted params
const _cache = {}

function buildKey(endpoint, params) {
  if (!endpoint) return null
  if (!params || Object.keys(params).length === 0) return endpoint
  var sorted = Object.keys(params)
    .sort()
    .reduce(function(acc, k) {
      acc[k] = params[k]
      return acc
    }, {})
  return endpoint + "|" + JSON.stringify(sorted)
}

export function useApi(endpoint, params) {
  // Compute stable string key — changes when endpoint or params change
  var key = buildKey(endpoint, params)

  var [state, setState] = useState(function() {
    return {
      data:    key && _cache[key] !== undefined ? _cache[key] : null,
      loading: !!endpoint && !(key && _cache[key] !== undefined),
      error:   null,
    }
  })

  // Use ref to track the current key inside async callbacks
  var keyRef = useRef(key)

  useEffect(function() {
    keyRef.current = key

    if (!endpoint || !key) {
      setState({ data: null, loading: false, error: null })
      return
    }

    // Cache hit — return immediately, no loading
    if (_cache[key] !== undefined) {
      setState({ data: _cache[key], loading: false, error: null })
      return
    }

    // Cache miss — fetch
    setState(function(prev) {
      return { data: prev.data, loading: true, error: null }
    })

    var cancelled = false

    // Build axios params from key (avoids stale closure on params object)
    // Re-derive from original arguments — they're fresh for this render
    axios.get(BASE + endpoint, { params: params || {} })
      .then(function(res) {
        if (cancelled) return
        if (keyRef.current !== key) return  // stale response
        _cache[key] = res.data
        setState({ data: res.data, loading: false, error: null })
      })
      .catch(function(err) {
        if (cancelled) return
        if (keyRef.current !== key) return
        setState({ data: null, loading: false, error: err })
      })

    return function() { cancelled = true }

  // key is a stable string — safe as dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}