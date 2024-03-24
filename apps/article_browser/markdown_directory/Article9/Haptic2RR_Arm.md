# Last year project review: 2-DOF RR arm for haptic feedback

## Design

### Hardware Design

The design is a 2 DOF robotic arm attached to the front part of people’s arm. 3D printed parts and acrylic panels were used in the mechanical structure. Motors used to drive the mechanism is DJI M3508 brushless motor. Within the excellent FOC algorithm in the motor controller, we could precisely control the output torque on joints, reducing a lot of extra work for adjusting the parameters and designing controllers. Originally the motor has a reducer with ration 19:1, but I removed it for better back-drivability. On end effector, I designed one universal port with 12 pins, enables us design different end effectors, with different sensors or actuators installed, based on needs. 

<img style="width: 100%" src="/apps/article_browser/markdown_directory/Article9/image001.png" alt="PCB">

As most parts of main structure were 3D printed parts, optimization for these parts has been made. Most of the 3D printed parts were supportless or requires little support structure for better surface quality and less material consumption. Because 3D printed parts were relatively soft and can be easily deformed, acrylic panels were added to increase the strength. Acrylic panels have higher rigidity and could be cut in minutes, and it was an ideal candidate to be applied in those place abrasion often occurs.

<img style="width: 100%" src="/apps/article_browser/markdown_directory/Article9/image003.png" alt="Optimization for 3D printed parts">

<img style="width: 100%" src="/apps/article_browser/markdown_directory/Article9/image005.png" alt="Optimization for durability">

### Embedded Design
For embedded software and hardware, I choose Robomaster Development Board Type A (STM32F427 chip) as the control core, with a real-time operating system ChibiOS running on it. With some experience in developing vehicle control programs on this platform, I modified one of the vehicle’s programs, refactor some low-level communication mechanisms, and make it adapted to the new hardware. The control program will communicate with motor using CAN (Controller Area Network) and communicate with Unity application using virtual COM port. The embedded code is stored on GitHub.

#### CAN-BUS Optimization

The motors developed by DJI could be an ideal choice for prototypes of robots, with its accurate torque control and easy hardware configuration. Wiring the signal cables is easy: Just connect the “CAN-H” and “CAN-L” pin to the network. Here is a simple sketch to illustrate the CAN-BUS:

<img style="width: 100%" src="/apps/article_browser/markdown_directory/Article9/image007.png" alt="CAN Network (High speed)">

*Low speed CAN network does not need terminal resistance. In our project, we did not use high speed CAN network so the terminal resistance is not applied. 

The modules on CAN could communicate with each other by publishing their messages on the network and listen the messages from network. For bandwidth, it can mount 7 motors on the network based on my previous experience.
CAN’s transmission data follows the format of CAN Frame, including SOF, Identifier, RTR, IDE, DLC, Data Field and so on. ChibiOS provided the interfaces for sending and receiving CAN frames, so we did not need to dig too much into the data format. In the program, identifier and data will be frequently used.
DJI’s motors has one universal communication protocol. Motor controllers will publish packages contains their feedback data to the CAN-BUS independently, and the control program will send the desired torque current each motor required to the network.
<div style="width: 100%; overflow-x: scroll; border: 1px solid #EEEEEE">
<table>
    <tr>
        <td colspan="2">Frame type: Standard Frame format: DATA DLC: 8 Bytes</td>
    </tr>
    <tr>
        <td>Data Fields</td>
        <td>Description</td>
    </tr>
    <tr>
        <td>DATA[0]</td>
        <td>Controls the rotor mechanical angle in higher order byte (8 bits)</td>
    </tr>
    <tr>
        <td>DATA[1]</td>
        <td>Controls the rotor mechanical angle in lower order byte (8 bits)</td>
    </tr>
    <tr>
        <td>DATA[2]</td>
        <td>Controls the rotational speed in higher order byte (8 bits)</td>
    </tr>
    <tr>
        <td>DATA[3]</td>
        <td>Controls the rotational speed in lower order byte (8 bits)</td>
    </tr>
    <tr>
        <td>DATA[4]</td>
        <td>Actual torque current in higher order byte (8 bits)</td>
    </tr>
    <tr>
        <td>DATA[5]</td>
        <td>Actual torque current in lower order byte (8 bits)</td>
    </tr>
    <tr>
        <td>DATA[6]</td>
        <td>Motor temperature</td>
    </tr>
    <tr>
        <td>DATA[7]</td>
        <td>Null</td>
    </tr>
</table>
</div>
<center>Table 1. C620 Motor Controller Feedback Data</center>
<br>
<div style="width: 100%; overflow-x: scroll; border: 1px solid #EEEEEE">
<table>
	<tr>
		<td colspan="3">
			Identifier: 0x200 Frame format: DATA
			<br>
			Frame type: Standard DLC: 8 Bytes
			<br>
		<td colspan="3">
			Identifier: 0x1FF Frame format: DATA
			<br>
			Frame type: Standard DLC: 8 Bytes<wbr>
	<tr>
		<td>
			Data Fields
		<td>
			Description
		<td>
			Speed Controller ID
		<td>
			Data Fields
		<td>
			Description
		<td>
			Speed Controller ID
	<tr>
		<td>
			DATA[0]
		<td>
			Controls the current value in higher order byte (8 bits)
		<td rowspan="2" style="padding-right: 3pt; padding-left: 3pt;">
			1
		<td>
			DATA[0]
		<td>
			Controls the current value in higher order byte (8 bits)
		<td rowspan="2" style="padding-right: 3pt; padding-left: 3pt;">
			5
	<tr>
		<td>
			DATA[1]
		<td>
			Controls the current value in lower order byte (8 bits)
		<td>
			DATA[1]
		<td>
			Controls the current value in lower order byte (8 bits)
	<tr>
		<td>
			DATA[2]
		<td>
			Controls the current value in higher order byte (8 bits)
		<td rowspan="2" style="padding-right: 3pt; padding-left: 3pt;">
			2
		<td>
			DATA[2]
		<td>
			Controls the current value in higher order byte (8 bits)
		<td rowspan="2" style="padding-right: 3pt; padding-left: 3pt;">
			6
	<tr>
		<td>
			DATA[3]
		<td>
			Controls the current value in lower order byte (8 bits)
		<td>
			DATA[3]
		<td>
			Controls the current value in lower order byte (8 bits)
	<tr>
		<td>
			DATA[4]
		<td>
			Controls the current value in higher order byte (8 bits)
		<td rowspan="2" style="padding-right: 3pt; padding-left: 3pt;">
			3
		<td>
			DATA[4]
		<td>
			Controls the current value in higher order byte (8 bits)
		<td rowspan="2" style="padding-right: 3pt; padding-left: 3pt;">
			7
	<tr>
		<td>
			DATA[5]
		<td>
			Controls the current value in lower order byte (8 bits)
		<td>
			DATA[5]
		<td>
			Controls the current value in lower order byte (8 bits)
	<tr>
		<td>
			DATA[6]
		<td>
			Controls the current value in higher order byte (8 bits)
		<td rowspan="2" style="padding-right: 3pt; padding-left: 3pt;">
			4
		<td>
			DATA[6]
		<td>
			Controls the current value in higher order byte (8 bits)
		<td rowspan="2" style="padding-right: 3pt; padding-left: 3pt;">
			8
	<tr>
		<td>
			DATA[7]
		<td>
			Controls the current value in lower order byte (8 bits)
		<td>
			DATA[7]
		<td>
			Controls the current value in lower order byte (8 bits)
</table>
</div>
<center>Table 2. C620 Motor Controller Receiving Data Format</center>

From the datasheet, the feedbacks from motors are independent with each other but the data to control the multiple motor’s torque currents are in one data frame. Thus, the targets are needed to be sent synchronously, or when sending one specific motor’s target current, other motors’ target currents will be overwritten. Based on different hard configuration, the identifier of motors may have to be changed, which made the problem a bit more complex. A CAN motor interface were created to solve the synchronize problem. With the optimization, it takes less resource with less loops ran. To solve the identifier change, logical identifiers (like ‘YAW’ ‘PITCH’ instead of ‘0x201’,’0x204’) were created, and program will automatically generate mappings with the hardware identifier with the logical identifier with a configuration class.

<img style="width: 100%" src="/apps/article_browser/markdown_directory/Article9/image009.png" alt="CAN Logical Identifier Mapping">

The CAN motor interface also showed its great extensibility, and it also supports RoboMaster’s other motors, like GM6020 and M2006. It was well tested, as I also helped UIUC’s RoboMaster Team iRM, to drive their vehicle’s chassis using this framework.

<img style="width: 100%" src="/apps/article_browser/markdown_directory/Article9/image011.jpg" alt="Testing framework on iRM Chassis">

#### Encapsulation of Code

ChibiOS were written in C. However, its core provides C++ wrappers, so we can use some features in C++ to simplify the code, make it more readable. One of the important features we are using is Class, which allows us to encapsulate different modules in static or dynamic C++ classes.

The control program mainly has 3 levels: Interface, scheduler, and logic. Classes in “Interface” level are wrapped with HAL operations. For example, in CAN Interfaces, it will listen the message in CAN bus, automatically invoke the registered listener function (Something like ROS’s subscriber). Scheduler will automatically perform some basic calculation and using Interface classes to interact with hardware. The logic level classes are higher level algorithm, their calculation results will be sent to scheduler and scheduler will regard them as reference and control the actuator to desired state. The overview of the program is shown in figure below.

<img style="width: 100%" src="/apps/article_browser/markdown_directory/Article9/image013.png" alt="Overview of Embedded Control Algorithm">

## Final work

<img style="width: 100%" src="/apps/article_browser/markdown_directory/Article9/image015.jpeg" alt="image15.png">

[Code Link](https://github.com/QuokeCola/Meta-Embedded), now I am working on applying the new CAN structure to other devices in Meta team.
