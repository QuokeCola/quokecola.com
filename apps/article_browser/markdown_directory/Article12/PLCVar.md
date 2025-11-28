# Structured Text (ST) Variable Declaration Guide

Structured Text (ST) handles variables differently from languages such as Python or C/C++.
In ST, **all variables must be declared in dedicated declaration sections**, located in the upper portion of the editor.

As shown in the picture,

![Pic1](apps/article_browser/markdown_directory/Article12/ScrShot1.png)

* **The upper red section** is used for *declaring variables* (similar to a `.h` header file in C/C++).
* **The lower blue section** contains the *execution logic* of a function, function block, or program (similar to a `.c/.cpp` implementation file).

---

# General Declaration Format

Variables follow the format:

```c
[variable_name] : [data_type];
```

Different declaration blocks exist depending on how the variable is used inside a function or function block.

---

# 1. Intermediate Variables (`VAR … END_VAR`)

Intermediate variables are local variables used only inside a function or function block.

```c
VAR
    var1 : DINT;
    var2 : USINT;
    var3 : ARRAY[0..1] OF DINT;
END_VAR
```

`VAR … END_VAR` defines a scope for local variables—**yes, even temporary variables must be declared here**.

For example, if your logic includes swapping values:

```c
c := a;
a := b;
b := c;
```

Then `a`, `b`, and `c` must all be declared in the `VAR … END_VAR` block.

---

# 2. Input Variables (`VAR_IN`)

`VAR_IN` defines variables that are *passed into* a function.
Changing these variables **inside the function does not affect** the variables outside the function.

Example function definition:

```c
FUNCTION VAR_IN_TEST
VAR_IN
    var1 : DINT;  // Input to the function
END_VAR
```

Function logic:

```c
var1 := 5;   // This does NOT modify the caller’s variable
```

Main program:

```c
VAR 
    input_var : DINT;
END_VAR

input_var := 3;
VAR_IN_TEST(var1 := input_var);
```

Here, `input_var` remains **3**, because `VAR_IN` inputs are **passed by value**.

---

# 3. Output Variables (`VAR_OUT`)

`VAR_OUT` defines values that the function outputs.
Unlike a typical C/C++ function, ST allows **multiple outputs**.

Declaration:

```c
VAR_OUT
    var1 : DINT;
    var2 : DINT;
END_VAR
```

Calling the function:

```c
VAR
    var_outside : DINT;
END_VAR

my_fun(var1 => var_outside);   // Equivalent to: var_outside = var1
```

---

# 4. Input/Output Variables (`VAR_IN_OUT`)

`VAR_IN_OUT` defines variables passed **by reference**.
Changes inside the function immediately modify the caller’s variables.

Declaration:

```c
VAR_IN_OUT
    var1 : DINT;
    var2 : DINT;
END_VAR
```

Function logic example:

```c
var1 := 100;
var2 := 10;
```

Calling code:

```c
var_outside1 := 5;
var_outside2 := 1;

my_fun(var1 := var_outside1, var2 := var_outside2);
```

Result:

```
var_outside1 == 100  
var_outside2 == 10
```

---

# 5. Constants (`VAR CONSTANT`)

Constant variables cannot be changed once declared.

```c
VAR CONSTANT
    var1 : DINT := 1;
END_VAR
```

This defines a constant `var1 = 1`.

---

# 6. Static Variables (`VAR_STAT`)

`VAR_STAT` is used in **function blocks (FBs)**.
Static variables behave like **global variables shared across all FB instances**.

Declaration:

```c
VAR_STAT
    var1 : DINT;
END_VAR
```

Example:

```c
VAR
    fb1 : fb_type;
    fb2 : fb_type;
END_VAR

fb1.stat1 := 2;
// fb2.stat1 is now also 2

fb2.stat1 := 6;
// fb1.stat1 is now also 6
```

This happens because both instances reference the same memory.

---

# Data Types (Quick Reference)

## Integer Types

| Data type | Lower bound | Upper bound | Memory |
| --------- | ----------- | ----------- | ------ |
| BYTE      | 0           | 255         | 8 bit  |
| WORD      | 0           | 65535       | 16 bit |
| DWORD     | 0           | 4294967295  | 32 bit |
| LWORD     | 0           | 2⁶⁴−1       | 64 bit |
| SINT      | −128        | 127         | 8 bit  |
| USINT     | 0           | 255         | 8 bit  |
| INT       | −32768      | 32767       | 16 bit |
| UINT      | 0           | 65535       | 16 bit |
| DINT      | −2147483648 | 2147483647  | 32 bit |
| UDINT     | 0           | 4294967295  | 32 bit |
| LINT      | −2⁶³        | 2⁶³−1       | 64 bit |
| ULINT     | 0           | 2⁶⁴−1       | 64 bit |

---

## Boolean

| Type | Memory |
| ---- | ------ |
| BOOL | 8 bit  |

---

## Floating Types

| Type  | Lower limit      | Upper limit     | Smallest value | Size   |
| ----- | ---------------- | --------------- | -------------- | ------ |
| REAL  | −3.402823e38     | 3.402823e38     | 1e−44          | 32 bit |
| LREAL | −1.797693134e308 | 1.797693134e308 | 4.94e−324      | 64 bit |

---

# Bit Access

TwinCAT allows accessing specific bits directly:

```c
var1 : DINT := 5;    // Binary: 0000 0101

var1.0   // 1
var1.1   // 0
var1.2   // 1
var1.3   // 0
...
```

---

# References

More data type information:
👉 [https://infosys.beckhoff.com/content/1033/tc3_plc_intro/2529388939.html](https://infosys.beckhoff.com/content/1033/tc3_plc_intro/2529388939.html)