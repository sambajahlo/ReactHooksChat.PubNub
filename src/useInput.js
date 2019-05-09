import { useState } from 'react';

function useInput()
{
  let [value, setValue] = useState('');
  let onChange = function(event){
    setValue(event.target.value);
  };
  return {
    value,
    setValue,
    onChange
  };
}

export default useInput;
