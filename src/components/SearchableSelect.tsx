import { Autocomplete, TextField } from '@mui/material';

export function SearchableSelect({ label, options, value, onChange, placeholder, required, error, helperText, disabled }: {
  label:string, options:{label:string, value:string}[], value:string | null, onChange:(v:string|null)=>void, placeholder?:string, required?:boolean, error?:boolean, helperText?:string, disabled?:boolean
}) {
  const selected = options.find(o=>o.value===value) || null;
  return (
    <Autocomplete
      options={options}
      value={selected}
      onChange={(_,nv)=> onChange((nv as any)?.value ?? null)}
      getOptionLabel={(o:any)=> o.label}
      disabled={disabled}
      renderInput={(params)=> <TextField {...params} label={label + (required?' *':'')} placeholder={placeholder} error={error} helperText={helperText} size="small" />}
      isOptionEqualToValue={(a,b)=> a.value===b.value}
    />
  );
}
