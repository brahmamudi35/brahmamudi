"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

/** A password box with an eye button to show or hide what was typed.
 * The button's name is screen-reader text, not an aria-label, so finding
 * the box by its "Password" label still matches only the box. */
function PasswordInput({
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = React.useState(false);
  return (
    <InputGroup className={className} data-disabled={disabled}>
      <InputGroupInput type={visible ? "text" : "password"} disabled={disabled} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff /> : <Eye />}
          <span className="sr-only">{visible ? "Hide password" : "Show password"}</span>
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { PasswordInput };
