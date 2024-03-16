# Open Virtual COM Port for ChibiOS

## ...Sad Story
Well, this drove me mad for several days.

The story was that I am trying to open up virtual COM port on ChibiOS with a STM32F427 core.

Followed with [official tutorial](https://github.com/ChibiOS/ChibiOS/tree/master/testhal/STM32/STM32F4xx/USB_CDC_IAD), 
I signed up `halconf.h`, `chconf.h` and revised the port alternates in `board.h`.

Packed with C++ class, everything goes fine until I plugged the board to my laptops. 
![USB Configuration](/apps/article_browser/markdown_directory/Article5/Screen%20Shot%202021-12-12%20at%2011.15.19%20PM.png)

![USB Port Class](/apps/article_browser/markdown_directory/Article5/Screen%20Shot%202021-12-12%20at%2011.15.25%20PM.png)

Nothing happened on Mac. Nothing happened on Windows. 

I checked configurations again and again. Everything looks fine.

Looked for answer on forum. I found one possible reason that for F103 chip, CAN-BUS and USB will share one SRAM so 
they cannot be used at the same time.

![Forum Answer](/apps/article_browser/markdown_directory/Article5/Screen%20Shot%202021-12-12%20at%2011.21.21%20PM.png)
<center>The forum answer</center>

Emm... Though my project use CAN to communicate with motor controllers, but my chip is F427, much expensive than that tiny F103...
so it should not have this problem. But I am too lazy to check for the datasheets. So why not have a try?

After disabled the CAN-BUS module, it does not work either. What hell is going on?

![What Hell is going on?!](/apps/article_browser/markdown_directory/Article5/mad.gif)

## Solution

Stackoverflow...zhihu...st forum...chibios forum...Github...

Bingo! When looking for answer on github, I found HKUST team used the exactly same platform as we did! And I found one
mysterious code in their USB configuration.

```cpp
#define BOARD_OTG_NOVBUSSENS
```

When I added this line to the `board.h` configuration file, it works!

## The Answer

After looking up the datasheets of my development board I believe I got the answer. In the schematic, VBUS on USB
did not connect to any PIN on STM32 (usually it was connected to `PA9`).

![PA9 VBUS](/apps/article_browser/markdown_directory/Article5/Screen%20Shot%202021-12-13%20at%2012.05.33%20AM.png)

![Schematic](/apps/article_browser/markdown_directory/Article5/Screen%20Shot%202021-12-12%20at%2011.44.21%20PM.png)

Firstly we need to understand how the USB works. USB has 2 PIN, `D+` and `D-`. For our PC, if `D+` was in high voltage, our PC felt really happy and said,

### "Oh yeah! One USB was plugged in!"

This is the background.

When without using VBUS sense, `D+` will continuously be pulled up. But in this case, `D+` was always charged. If you accidentally drop some metal, or 
salt solution on the port, short circuit may happen. No one likes that, so VBUS sense was the solution.

The VBUS sense will keep `D+` in low voltage. But ChibiOS will continuously detect VBUS pin. When VBUS sense something was plugged in, ChibiOS will
pull up `D+` pin and let our PC know, our device was connected. Unfortunately, though the function was originally enabled in ChibiOS,
VBUS was not connected and our program will never know whether USB has plugged in or not, neither `D+` will be pulled up.

So what `PA9` was connected to? 

![Magic](/apps/article_browser/markdown_directory/Article5/Screen%20Shot%202021-12-13%20at%2012.06.03%20AM.png)

<center>Well, something magic.</center>