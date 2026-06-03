import { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';

export function useStoredState(key, defaultValue) {
  const [value, setValue] = useState(() => StorageService.load(key, defaultValue));

  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  useEffect(() => { StorageService.save(key, value); }, [key, value]);

  useEffect(() => {
    return StorageService.subscribe(() => {
      setValue(StorageService.load(key, defaultValueRef.current));
    });
  }, [key]);

  return [value, setValue];
}
