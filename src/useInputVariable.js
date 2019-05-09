import { useState, useCallback } from 'react';

function useInputVariable(defaultValue)
{
  let [value, setValue] = useState(defaultValue);
  let onChange = useCallback(function(event){
    setValue(event.target.value);
  },[]);
  return {
    value,
    setValue,
    onChange
  };
}

export default useInputVariable;
