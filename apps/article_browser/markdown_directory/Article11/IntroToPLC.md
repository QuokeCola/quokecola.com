# PLC Programming 1: Heading to PLC

Over the last year, I was working on a project that relates to PLC programming. Tried two brands - Beckhoff and OMRON and I decided to share some experiences of using them.

For this series, I will start from Beckhoff since their TwinCAT IDE is free, and you could use their trial license infinitely for learning purpose. Besides, TwinCAT has a well-built documentation website that allows learners to look up for references quickly [[link](https://infosys.beckhoff.com/)].

So, what is PLC and why using it?

> A programmable logic controller (PLC) or programmable controller is an industrial computer that has been ruggedized and adapted for the control of manufacturing processes, such as assembly lines, machines, robotic devices, or any activity that requires high reliability, ease of programming, and process fault diagnosis. [[wiki](https://en.wikipedia.org/wiki/Programmable_logic_controller)]

What language it uses?

> Part 3 of IEC 61131 deals with basic software architecture and programming languages of the control program within PLC. It defines three graphical and two textual programming language standards: 
> 1. Ladder diagram (LD), graphical
> 2. Function block diagram (FBD), graphical
> 3. Structured text (ST), textual
> 4. Instruction list (IL), textual (deprecated in 3rd edition of the standard[3])
> 5. Sequential function chart (SFC), has elements to organize programs for sequential and parallel control processing, graphical.
> [[wiki](https://en.wikipedia.org/wiki/IEC_61131-3)]

Generally, the Ladder diagram (LD) and Structured text (ST) are two well known languages that used in PLC programming.
LD represents the program in a graphical way and ST represents the program in a conventional text way. 
If you are familiar with at least one programming language, I believe ST will be really easy for you to hands on and this is also what I have experienced.

In this series, I will try to create a step-to-step tutorial, that helps you to make your PLC program interact with the real world.