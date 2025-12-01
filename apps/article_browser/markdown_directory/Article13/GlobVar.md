# Global Variables
Global variables declares the variables that can be accessed everywhere in the PLC task.

To declare global variables:

1. Create a file for store global variables (global variable list, usually you will store it in a folder called `GVLs`)
2. Declare the variables in the file.
3. To access the global variable in tasks, just type `<your global variable list's file name>.<your variable name>`

Global variables can be used to declare the interface of your PLC program. I.E, if the PLC task need to control the motor through EtherCAT, global variables in PLC task can be linked to the feedback data of the motors and update at certain frequency. Or, if you need to control the PLC task by ADS, or control the task by other PLC tasks, you can use global variables to link the input and output signal from tasks to tasks.

Specifically, here are the different types of global variables:


|Variable types| Input variables | Output variables | In/out variables
|--------------|----|-----|----|
|Syntax| `%I*` | `%Q*` | `%M*` |

The input variables means that these variables can be written from other programs. They are ideal for recording the feedback data from other PLC tasks or from sensors. The syntax for declaring the input variable is
```c
VAR_GLOBAL
    var1 AT%I*:<datatype>;
END_VAR 
```

The output variables means that these variables can be read from other programs. They are ideal for sending the data to other PLC tasks or to actuators. The syntax for declaring the output variable is
```c
VAR_GLOBAL
    var1 AT%Q*:<datatype>;
END_VAR 
```

The input/output variables means that these variables can be both read or written from other programs. The syntax for declaring the output variable is
```c
VAR_GLOBAL
    var1 AT%M*:<datatype>;
END_VAR 
```

## TwinCAT IO link
To link the feedback data and commands from PLC tasks to actuators and sensors on EtherCAT network, please refer to this video:

[![TwinCAT IO link](https://img.youtube.com/vi/lgf_GqIvkCI/0.jpg)](https://www.youtube.com/watch?v=lgf_GqIvkCI)