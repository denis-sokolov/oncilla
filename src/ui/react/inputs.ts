import { ReactType } from "./types";

export function makeSemiControlledInput(React: ReactType) {
  return function SemiControlledInput(
    props: React.InputHTMLAttributes<HTMLInputElement>
  ) {
    const { defaultValue, onBlur, onChange, onFocus, value } = props;
    if (defaultValue !== undefined)
      throw new Error(
        `Use SemiControlledInput with onChange and value, not defaultValue`
      );
    const [focused, setFocused] = React.useState(false);
    const [valueUnderEdit, setValueUnderEdit] = React.useState(value);
    return React.createElement("input", {
      ...props,
      onBlur: (e) => {
        if (onChange && valueUnderEdit !== value)
          onChange({ target: e.target } as React.ChangeEvent<HTMLInputElement>);
        if (onBlur) onBlur(e);
        setFocused(false);
      },
      onChange: (e) => setValueUnderEdit(e.target.value),
      onFocus: (e) => {
        setValueUnderEdit(value);
        setFocused(true);
        if (onFocus) onFocus(e);
      },
      value: focused ? valueUnderEdit : value,
    });
  };
}
