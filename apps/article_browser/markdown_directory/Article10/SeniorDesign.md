# Senior Design: 2-DOF RR arm for haptic feedback II

## Existing problem
The previous design has several problems. 
1. User friendly.
   The shape of device does not fit user's arm well and it will rotate around user's arm.
2. Function.
   For first design, only a ball-shaped end effector was made, the shape render function has not be deployed.
3. Mechanical structure.
   1. The mechanical structure also has limitations. The motor on first joint need to support the whole robotic arm, so this 
   motor suffers larger torque output, frequently causes overheating-shutdown.
   2. End effector is not moving synchronously with hand, the offset of center of hand and end effector would change.

## Solution
To solve this problem, I re-design the mechanical structure.
<img src="/apps/article_browser/markdown_directory/Article10/CAD.png" alt="rendered_img" style="width:20rem">

The base was re-designed according to a real-people arm. It was lofted with four curves to fit user's hand.
The carbon fiber mechanism on the top is a structure to adjust the width of device to fit different user's hand. We applied cotton 
on the inner surface, so user will be more comfortable when wearing this device.
<img src="/apps/article_browser/markdown_directory/Article10/ue.JPG" alt="user_experience" style="width:20rem">

The new structure uses two motors to drive the first joint, so it can provide larger torque and render forces in different direction.
<img src="/apps/article_browser/markdown_directory/Article10/arm_motor.JPG" alt="duo_motor" style="width:20rem">

In the new design, the YAW and PITCH axis is switched, so the projection of end effector always lies on user's hand.
<img src="/apps/article_browser/markdown_directory/Article10/mech_render.jpeg" alt="mechanical_structure" style="width:20rem">
The shape render end effector is also re-designed. In previous design, 3D printed part is moving alone the carbon fiber rod,
the friction would significantly change, which is not smooth enough. We replaced the carbon fiber rod with a steel one, as well as 
add bearing between the surface, applied WD-40 on rod, to make it smoother.
<img src="/apps/article_browser/markdown_directory/Article10/finger.JPG" alt="finger" style="width:20rem">

Here is our test:

<div style="position: relative;width: 100%;height: 0;padding-bottom: 56%">
<iframe src="https://player.bilibili.com/player.html?aid=941910218&bvid=BV1mW4y187Na&cid=801493425&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="position: absolute; width: 100%;height: 100%;left: 0;top: 0;z-index: 1"> </iframe>
</div>
