"""Cut a web out of a photograph, split into leather, lacing and finger edge.

SAM3's text prompts are no help here — "web of the baseball glove" scores 0.00
on these photographs, the same as on the rainbow calibration glove. Nor is
colour on its own: on the Columbia glove the web's leather runs from V 0.29 in
shadow to 0.60 in light and the shell in shadow reaches 0.60 too, so any
threshold either loses half the web or swallows half the glove.

What works is tracing the web's outline off the photograph and taking what is
inside it. Within the outline the split really is two-way — the only bright
thing in there is lace — so Otsu finds it per photograph with nothing to tune.

`finger_poly` carries the index finger's own right-hand edge along with the
web, so the join between the two comes from a single photograph instead of
being butted against a different glove's finger. It stays a separate layer and
takes the finger's colour, because that is what it is.

    python glove_builder/make_web.py --web spiral-i

Writes runs/web-<slug>/{leather,lace,finger}.png and check.jpg — the last
being the overlay to look at before believing any of it.
"""

import argparse
import json
import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = pathlib.Path(__file__).parent

# One entry per photographed web. `seam` is (y, x) waypoints down the welt
# that bounds the web on the finger side; everything left of it is another
# panel. `dark` splits leather from lace by luminance — which of the two is
# darker is what `leather_is_dark` says.
WEBS = {
    "closed-diamond-net": {
        "photo": "images/drive-2026-07/Blue_web1.jpg",
        "glove_mask": "runs/blue-web1/masks/glove.png",
        "dark": 100,
        "leather_is_dark": True,
        # Drawn by hand on the photograph, every piece of it. The seam, the
        # loop boxes and the size cap that used to find this web by brightness
        # are gone with it: they were all approximations of this outline, and
        # Scott had to correct each of them in turn.
        "web_polys": [
            [(693, 721), (703, 758), (724, 800), (744, 834), (748, 851),
             (762, 856), (754, 869), (744, 878), (730, 885), (729, 890),
             (804, 942), (815, 941), (824, 929), (835, 915), (836, 898),
             (870, 928), (884, 928), (900, 935), (911, 947), (920, 954),
             (970, 958), (988, 937), (1006, 905), (1006, 829), (1002, 829),
             (998, 840), (991, 844), (981, 847), (968, 848), (959, 847),
             (952, 838), (946, 830), (834, 838), (834, 809), (821, 816),
             (815, 808), (805, 765), (808, 752), (820, 744), (816, 734),
             (818, 715), (825, 708), (848, 717), (858, 722), (861, 721),
             (867, 711), (884, 704), (903, 700), (913, 705), (923, 718),
             (967, 711), (972, 694), (992, 707), (1013, 707), (1015, 737),
             (1010, 738), (1009, 753), (1005, 767), (998, 784), (989, 784),
             (985, 776), (990, 770), (989, 758), (963, 763), (957, 757),
             (955, 746), (927, 750), (920, 764), (909, 775), (896, 778),
             (891, 777), (873, 780), (858, 780), (847, 777), (847, 785),
             (851, 795), (851, 802), (939, 800), (943, 788), (971, 798),
             (978, 797), (981, 790), (990, 787), (999, 782), (1007, 766),
             (1013, 773), (1014, 784), (1019, 793), (1022, 812), (1040, 831),
             (1041, 797), (1054, 748), (1069, 742), (1080, 708), (1089, 667),
             (1090, 651), (1085, 648), (1092, 576), (1097, 565), (1101, 575),
             (1110, 572), (1117, 563), (1131, 488), (1106, 467), (1092, 431),
             (1100, 401), (1127, 365), (1116, 342), (1101, 352), (1091, 347),
             (1094, 327), (1107, 310), (1113, 300), (1112, 295), (1095, 313),
             (1084, 316), (1079, 310), (1080, 293), (1088, 281), (1099, 268),
             (1092, 261), (1073, 278), (1065, 280), (1060, 272), (1061, 257),
             (1062, 245), (1066, 237), (1066, 228), (1075, 225), (1070, 215),
             (1057, 234), (1048, 241), (1039, 239), (1039, 225), (1039, 216),
             (1039, 203), (1042, 195), (1036, 188), (1031, 188), (1023, 198),
             (1017, 201), (1012, 193), (1012, 179), (1012, 167), (1015, 156),
             (1006, 147), (998, 156), (991, 162), (982, 158), (975, 147),
             (973, 135), (977, 123), (961, 112), (951, 126), (944, 134),
             (935, 129), (924, 120), (921, 107), (927, 96), (907, 87),
             (891, 106), (881, 105), (874, 100), (867, 92), (866, 82),
             (873, 72), (865, 67), (852, 79), (847, 85), (834, 83), (827, 77),
             (818, 70), (810, 57), (809, 48), (802, 43), (753, 21), (748, 24),
             (754, 40), (756, 48), (754, 60), (737, 53), (738, 66), (752, 63),
             (752, 80), (752, 87), (741, 94), (741, 103), (743, 118),
             (745, 145), (746, 148), (730, 137), (717, 135), (707, 137),
             (699, 141), (692, 149), (692, 157), (694, 162), (693, 175),
             (692, 194), (690, 212), (687, 231), (690, 238), (712, 234),
             (733, 237), (738, 243), (729, 296), (729, 346), (713, 342),
             (700, 338), (684, 341), (671, 352), (672, 406), (667, 444),
             (672, 451), (693, 447), (709, 451), (721, 455), (709, 465),
             (698, 581), (674, 577), (649, 578), (639, 695), (643, 699),
             (658, 699), (692, 701)],
        ],
        # Twenty-seven pieces of lacing, one polygon each — the diamonds
        # across the face, the loops round the rim, the run down the thumb
        # side. Trimmed back to their own colour inside each polygon, so a
        # lace traced a little wide does not leave a pale fringe on the navy.
        "lace_polys": [
            [(839, 176), (857, 180), (884, 201), (908, 200), (916, 215),
             (915, 228), (907, 231), (914, 241), (909, 260), (914, 271),
             (888, 250), (879, 235), (861, 242), (849, 239), (841, 231),
             (841, 223), (855, 210), (840, 203), (837, 193), (836, 185)],
            [(843, 268), (840, 290), (855, 310), (842, 316), (841, 327),
             (843, 335), (860, 345), (876, 334), (887, 347), (898, 363),
             (911, 373), (907, 363), (916, 338), (906, 329), (914, 326),
             (910, 298), (885, 300), (857, 275)],
            [(844, 370), (850, 374), (882, 404), (904, 402), (910, 431),
             (901, 438), (908, 442), (901, 467), (907, 479), (892, 470),
             (876, 442), (857, 451), (845, 447), (838, 437), (838, 425),
             (854, 417), (839, 402), (837, 382)],
            [(841, 478), (836, 484), (834, 500), (838, 513), (847, 526),
             (834, 531), (832, 544), (835, 553), (842, 559), (867, 553),
             (877, 563), (889, 584), (895, 581), (893, 573), (899, 548),
             (894, 542), (902, 540), (900, 511), (894, 507), (877, 513),
             (847, 482)],
            [(834, 590), (826, 601), (826, 619), (829, 629), (842, 639),
             (825, 646), (823, 652), (823, 662), (829, 673), (861, 666),
             (877, 698), (883, 693), (886, 673), (888, 662), (883, 653),
             (893, 652), (885, 619), (871, 626)],
            [(1013, 683), (1020, 693), (1030, 666), (1031, 646), (1034, 633),
             (1028, 633), (996, 599), (991, 620), (994, 627), (1005, 638),
             (987, 642), (984, 651), (984, 659), (992, 668), (1015, 665)],
            [(1029, 594), (1038, 603), (1042, 579), (1044, 560), (1040, 546),
             (1031, 531), (1020, 521), (1008, 516), (1005, 522), (1009, 542),
             (1021, 547), (1000, 551), (999, 563), (1009, 578), (1029, 575)],
            [(1047, 518), (1051, 498), (1053, 479), (1049, 465), (1045, 457),
             (1038, 448), (1030, 443), (1020, 437), (1016, 440), (1018, 459),
             (1025, 467), (1008, 476), (1021, 496), (1039, 492), (1037, 511),
             (1041, 517)],
            [(1036, 392), (1029, 380), (1031, 362), (1042, 367), (1051, 376),
             (1056, 386), (1061, 401), (1061, 412), (1061, 421), (1060, 429),
             (1055, 441), (1045, 434), (1050, 416), (1033, 418), (1024, 406),
             (1021, 393)],
            [(1125, 371), (1131, 416), (1143, 419), (1149, 422), (1157, 421),
             (1169, 443), (1160, 451), (1163, 473), (1168, 490), (1176, 525),
             (1180, 553), (1184, 586), (1188, 621), (1190, 666), (1193, 727),
             (1196, 765), (1172, 774), (1162, 672), (1158, 605), (1153, 550),
             (1134, 468), (1122, 468), (1114, 460), (1113, 434), (1110, 409),
             (1106, 395)],
            [(1000, 767), (1007, 761), (1008, 738), (1015, 736), (1012, 708),
             (992, 708), (973, 696), (968, 711), (923, 719), (912, 707),
             (903, 702), (884, 705), (868, 713), (860, 722), (856, 722),
             (843, 717), (826, 709), (820, 716), (818, 729), (818, 735),
             (822, 745), (814, 748), (810, 753), (807, 765), (809, 775),
             (816, 807), (822, 815), (835, 808), (836, 836), (947, 829),
             (960, 847), (966, 847), (977, 846), (986, 844), (994, 835),
             (999, 828), (1007, 826), (1019, 848), (1034, 860), (1050, 874),
             (1065, 882), (1078, 887), (1085, 887), (1093, 891), (1099, 888),
             (1098, 868), (1091, 865), (1087, 865), (1087, 856), (1078, 851),
             (1071, 856), (1064, 854), (1052, 845), (1041, 835), (1031, 825),
             (1024, 815), (1020, 809), (1016, 797), (1014, 787), (1012, 783),
             (1012, 773), (1007, 768), (1004, 775), (1001, 783), (998, 786),
             (989, 788), (983, 791), (978, 799), (972, 799), (944, 790),
             (940, 800), (850, 802), (850, 796), (846, 786), (845, 775),
             (853, 777), (861, 780), (877, 778), (888, 777), (894, 777),
             (897, 777), (907, 774), (915, 768), (920, 762), (927, 750),
             (956, 746), (958, 756), (963, 762), (989, 757), (991, 770),
             (986, 775), (990, 783), (997, 783), (1000, 779), (1004, 769),
             (1006, 762)],
            [(760, 856), (749, 873), (742, 877), (736, 882), (727, 881),
             (725, 875), (736, 852), (746, 850)],
            [(689, 702), (690, 707), (685, 716), (653, 721), (645, 701)],
            [(656, 577), (668, 570), (679, 573), (681, 577)],
            [(670, 450), (669, 468), (674, 475), (700, 477), (704, 466),
             (711, 454), (695, 449)],
            [(1007, 830), (1007, 915), (1000, 932), (995, 935), (994, 944),
             (991, 962), (1011, 969), (1022, 968), (1022, 943), (1020, 939),
             (1018, 848)],
            [(690, 238), (691, 253), (695, 258), (701, 263), (721, 263),
             (730, 250), (733, 237), (712, 235)],
            [(668, 20), (681, 12), (694, 8), (706, 8), (720, 12), (734, 19),
             (749, 26), (756, 48), (754, 58), (738, 52), (720, 44), (704, 41),
             (686, 44), (667, 46)],
            [(798, 39), (806, 32), (812, 32), (821, 35), (825, 39), (837, 43),
             (843, 40), (867, 51), (869, 69), (865, 67), (856, 74), (849, 81),
             (849, 83), (837, 83), (827, 75), (821, 69), (815, 61), (811, 54),
             (810, 46)],
            [(882, 63), (909, 72), (911, 87), (908, 86), (892, 104),
             (883, 104), (874, 97), (870, 91), (867, 82), (874, 72)],
            [(929, 97), (936, 88), (962, 97), (962, 112), (946, 131),
             (943, 132), (937, 128), (926, 120), (922, 106)],
            [(986, 112), (1009, 127), (1012, 133), (1006, 146), (995, 157),
             (992, 160), (985, 158), (978, 149), (974, 136), (978, 123)],
            [(1013, 153), (1018, 157), (1013, 166), (1014, 191), (1017, 199),
             (1024, 196), (1032, 187), (1046, 168), (1023, 148), (1016, 148)],
            [(1041, 190), (1043, 194), (1040, 202), (1041, 237), (1046, 240),
             (1056, 233), (1071, 210), (1048, 188)],
            [(1074, 228), (1068, 236), (1063, 249), (1063, 262), (1062, 271),
             (1066, 278), (1073, 276), (1090, 262), (1098, 254), (1085, 238)],
            [(1101, 266), (1127, 329), (1119, 345), (1117, 341), (1102, 351),
             (1092, 347), (1096, 326), (1113, 301), (1111, 295), (1100, 306),
             (1095, 312), (1087, 314), (1082, 309), (1082, 292), (1090, 280),
             (1096, 273)],
            [(751, 64), (751, 86), (739, 95), (732, 101), (727, 71)],
        ],
        # The knot along the bottom belongs to the glove, not to this web.
        "knot_polys": [
            [(1009, 967), (1006, 995), (914, 989), (900, 1006), (890, 1010),
             (875, 1009), (862, 1015), (839, 1017), (822, 1010), (811, 1000),
             (802, 991), (654, 953), (613, 945), (608, 935), (628, 911),
             (783, 951), (785, 941), (788, 944), (818, 943), (827, 950),
             (835, 947), (849, 941), (859, 936), (873, 928), (885, 929),
             (899, 935), (914, 951), (921, 959)],
        ],
        # It is a closed web — the name says so, and Scott says so: "the web
        # is fully closed so there shouldn't be any open parts left." Every
        # gap in the opening is the cutout falling short, none of them are
        # windows.
        "closed": True,
    },
    # The Japan glove has this web too, but its navy web is the same navy as
    # its fingers and half of it sits in shadow against a black background —
    # 47k px of fragments and no lace at all. The Columbia glove is the same
    # case as the Closed Diamond Net: light shell, dark web, shot on white.
    "spiral-i": {
        "photo": "images/drive-2026-07/Blue1.jpg",
        "glove_mask": "runs/spiral-i-blue/masks/glove.png",

        # traced off the photograph: down the outer rim, across the bottom,
        # back up the edge against the index finger
        "outline": [(895, 45), (985, 35), (1065, 70), (1120, 150), (1150, 280),
                    (1150, 400), (1120, 530), (1080, 650), (1030, 760),
                    (975, 860), (930, 940), (880, 1010), (800, 1025),
                    (730, 1010), (692, 975), (676, 915), (674, 862),
                    (686, 818), (712, 784), (762, 764), (800, 700),
                    (830, 640), (845, 560), (838, 480), (848, 400),
                    (862, 300), (878, 200), (890, 110)],
        # Scott's idea: carry the index finger's own right-hand edge in the
        # cutout, so the join between finger and web comes from one photograph
        # rather than being butted up against a different glove's finger. It
        # is kept as its own layer and takes the index finger's colour, not
        # the web's — it is finger leather, and the order form asks for it
        # separately.
        "finger_poly": [(890, 45), (890, 110), (878, 200), (862, 300),
                        (848, 400), (838, 480), (845, 560), (830, 640),
                        (800, 700), (762, 764), (712, 784), (686, 818),
                        (674, 862), (676, 915), (692, 975), (730, 1010),
                        (652, 998), (600, 958), (582, 900), (584, 850),
                        (598, 802), (632, 770), (686, 744), (716, 686),
                        (742, 628), (752, 552), (742, 474), (752, 394),
                        (764, 294), (778, 194), (786, 104), (788, 45)],
        # Traced by Scott on the photograph itself, with the tracer: the
        # crossing lace, the knot across the bottom, the spiral's own lacing
        # and every loop round the rim. Only the bright pixels inside each
        # polygon are taken, so the shell the lace passes over stays out.
        "lace_polys": [
            [(604, 726), (668, 716), (770, 762), (752, 800), (648, 772),
             (600, 752)],
            [(754, 725), (733, 751), (868, 887), (861, 888), (909, 882),
             (905, 880)],
            [(906, 878), (922, 867), (939, 870), (946, 879), (954, 890),
             (958, 897), (958, 904), (1029, 981), (1027, 1010), (1019, 1010),
             (935, 926), (910, 928), (906, 919), (880, 919), (870, 914),
             (865, 907), (862, 890)],
            [(835, 769), (830, 783), (847, 807), (881, 791), (898, 797),
             (939, 804), (955, 776), (951, 766), (971, 739), (1005, 672),
             (1005, 651), (990, 636), (972, 642), (976, 618), (969, 605),
             (962, 597), (955, 591), (929, 625), (939, 642), (921, 670),
             (905, 706), (884, 740), (872, 747), (836, 769)],
            [(898, 797), (877, 849), (885, 857), (897, 860), (907, 855),
             (913, 847), (931, 802)],
            [(828, 487), (815, 511), (865, 541), (871, 532), (881, 504)],
            [(856, 369), (918, 388), (919, 399), (912, 420), (856, 408),
             (850, 401), (846, 382)],
            [(892, 485), (883, 516), (1076, 566), (1094, 536), (974, 502),
             (897, 483)],
            [(1092, 535), (1099, 524), (1123, 532), (1124, 546), (1131, 543),
             (1133, 562), (1126, 569), (1126, 585), (1128, 596), (1138, 627),
             (1183, 812), (1161, 819), (1131, 712), (1126, 719), (1118, 723),
             (1109, 704), (1107, 598), (1073, 611), (1069, 595), (1056, 588),
             (1055, 576), (1050, 570), (1056, 562)],
            [(1027, 715), (1049, 746), (1049, 753), (1062, 761), (1063, 782),
             (1070, 810), (1060, 823), (1048, 860), (1028, 890), (1015, 894),
             (1013, 907), (990, 935), (986, 905), (964, 910), (958, 894),
             (978, 888), (969, 877), (983, 851), (993, 820), (1007, 789),
             (1018, 761), (1024, 765), (1025, 739), (1011, 728)],
            [(1065, 784), (1138, 727), (1145, 756), (1069, 811)],
            [(1133, 545), (1140, 466), (1134, 390), (1146, 384), (1146, 346),
             (1117, 340), (1111, 347), (1095, 337), (1066, 313), (1040, 284),
             (1017, 241), (1003, 243), (1007, 272), (1021, 300), (1043, 333),
             (1083, 366), (1096, 377), (1078, 387), (1081, 408), (1091, 432),
             (1116, 420), (1119, 445), (1118, 485), (1112, 529), (1120, 553)],
            [(882, 165), (894, 165), (910, 170), (934, 180), (934, 203),
             (927, 209), (912, 209), (905, 200), (894, 201), (881, 188),
             (876, 183), (881, 166)],
            [(851, 41), (850, 64), (864, 69), (873, 65), (884, 63), (899, 67),
             (906, 74), (922, 88), (924, 71), (921, 54), (907, 46), (893, 39),
             (878, 35), (870, 35), (861, 39)],
            [(955, 70), (968, 69), (976, 75), (984, 83), (988, 86), (994, 85),
             (1016, 99), (1010, 112), (1005, 120), (995, 127), (983, 121),
             (979, 111), (972, 102), (965, 89), (965, 83)],
            [(1027, 117), (1049, 131), (1043, 147), (1030, 160), (1022, 157),
             (1015, 152), (1014, 140), (1014, 129)],
            [(1060, 163), (1071, 161), (1088, 182), (1076, 200), (1063, 204),
             (1055, 195), (1054, 185), (1056, 175)],
            [(1082, 210), (1084, 219), (1079, 230), (1079, 248), (1085, 256),
             (1094, 248), (1103, 239), (1092, 213)],
            [(1091, 261), (1101, 264), (1102, 268), (1107, 290), (1087, 303),
             (1080, 291), (1089, 276), (1092, 268)],
            [(1097, 305), (1107, 309), (1111, 337), (1103, 344), (1086, 334)],
        ],
        # The web's leather, drawn by hand on the photograph rather than
        # guessed at by brightness: the panel itself, following the lacing
        # round every loop, and the three pieces across the bottom.
        "web_polys": [
            [(913, 49), (925, 44), (937, 52), (955, 73), (964, 82), (964, 91),
             (977, 113), (995, 129), (1008, 117), (1019, 125), (1012, 140),
             (1016, 153), (1027, 162), (1044, 147), (1060, 168), (1054, 183),
             (1054, 192), (1062, 206), (1077, 200), (1083, 212), (1075, 233),
             (1077, 249), (1082, 257), (1089, 253), (1092, 266), (1084, 284),
             (1084, 302), (1095, 301), (1097, 308), (1089, 328), (1055, 303),
             (1033, 275), (1021, 241), (1002, 242), (1008, 272), (1022, 307),
             (1039, 331), (1057, 346), (1079, 365), (1076, 391), (1080, 414),
             (1089, 437), (1111, 428), (1113, 451), (1115, 488), (1112, 525),
             (1099, 522), (1091, 536), (969, 499), (888, 483), (882, 518),
             (950, 535), (1009, 550), (1060, 566), (1049, 569), (1058, 591),
             (1067, 595), (1069, 612), (1091, 607), (1081, 643), (1072, 662),
             (1051, 680), (1052, 690), (1054, 696), (1052, 719), (1044, 731),
             (1028, 711), (1014, 728), (1020, 741), (1021, 762), (1018, 761),
             (988, 831), (981, 820), (975, 811), (984, 795), (989, 777),
             (983, 759), (974, 748), (975, 738), (991, 701), (1008, 674),
             (1011, 655), (1000, 639), (986, 633), (979, 639), (978, 618),
             (971, 600), (955, 586), (930, 622), (932, 634), (936, 641),
             (920, 670), (901, 706), (886, 737), (889, 744), (880, 748),
             (872, 744), (856, 757), (838, 766), (830, 781), (836, 799),
             (854, 808), (882, 793), (896, 797), (876, 845), (780, 747),
             (780, 738), (801, 685), (813, 654), (861, 704), (904, 617),
             (862, 571), (846, 559), (847, 535), (864, 541), (876, 533),
             (880, 510), (869, 498), (894, 463), (890, 419), (908, 422),
             (918, 409), (921, 389), (909, 381), (908, 373), (925, 372),
             (968, 412), (988, 443), (1017, 495), (1029, 456), (1021, 416),
             (1015, 377), (1002, 338), (980, 301), (954, 265), (926, 234),
             (910, 218), (910, 207), (920, 212), (930, 209), (936, 201),
             (936, 186), (936, 172), (917, 170), (917, 150), (922, 149),
             (914, 133), (904, 136), (902, 98), (923, 94), (926, 77),
             (926, 65), (922, 55)],
            [(779, 804), (776, 840), (776, 869), (783, 897), (794, 926),
             (809, 952), (827, 974), (856, 999), (878, 1013), (902, 1013),
             (920, 996), (941, 944), (941, 934), (934, 928), (907, 931),
             (903, 920), (887, 919), (875, 916), (865, 912), (861, 892),
             (860, 881)],
            [(890, 860), (902, 876), (911, 870), (923, 865), (937, 865),
             (947, 873), (958, 893), (961, 884), (961, 867), (953, 849),
             (947, 832), (947, 814), (931, 806), (924, 825), (917, 844),
             (910, 855), (904, 859)],
            [(959, 892), (992, 821), (991, 756), (987, 707), (975, 732),
             (958, 764), (958, 775), (942, 804), (931, 805), (927, 829)],
        ],
        # The knotted lace across the bottom. It is the glove's, not the
        # web's — the page draws its own over whichever web is fitted — so it
        # is kept out of the cutout rather than warped in a second time.
        "knot_polys": [
            [(732, 753), (752, 724), (903, 883), (909, 873), (921, 869),
             (933, 867), (944, 874), (952, 885), (958, 899), (959, 906),
             (1029, 981), (1029, 1008), (1017, 1009), (936, 926), (909, 929),
             (905, 918), (875, 919), (867, 912), (861, 886), (869, 889),
             (732, 751)],
        ],
        # The low loop beside back 2 is a strap running diagonally down to the
        # heel, not a blob, so a box round it takes back 2's leather with it —
        # three tries proved that. Traced as a polygon off Scott's reading of
        # the photograph instead.
        "loop_polys": [[(760, 840), (899, 935), (780, 935), (730, 890)]],
        # Solid panel with the spiral laced across it — the photograph shows
        # no daylight through the middle of it. Marking it so keeps the gaps
        # the traced lacing leaves behind from being read as windows.
        "closed": True,
    },
    # Columbia shell with yellow lacing. The web's leather is the same leather
    # as the shell, so value cannot split it from anything — Otsu finds no
    # edge at all. Hue does: the leather sits at 202 degrees and the lace at 45.
    "standard-i": {
        "photo": "images/drive-2026-07/YellowPad1.jpg",
        "glove_mask": "runs/standard-i/masks/glove.png",
        "lace_hue": (20, 70),
        "outline": [(800, 40), (880, 30), (980, 60), (1060, 130), (1120, 260),
                    (1145, 420), (1130, 560), (1090, 690), (1020, 820),
                    (955, 920), (890, 985), (825, 1005), (778, 985),
                    (762, 930), (764, 860), (772, 790), (782, 700),
                    (790, 580), (795, 450), (797, 320), (798, 180)],
        # The band stops at 752: any further left and it takes in the finger
        # pad, and the calibration glove has no pad fitted — that is a separate
        # question on the form, so pasting one on would answer it for the
        # customer.
        "finger_poly": [(800, 40), (798, 180), (797, 320), (795, 450),
                        (790, 580), (782, 700), (772, 790), (764, 860),
                        (762, 930), (778, 985),
                        (752, 975), (752, 900), (754, 830), (760, 740),
                        (764, 620), (766, 480), (767, 340), (768, 190),
                        (768, 40)],
    },
    # Pink shell with light-blue lacing, and the same story: the web's leather
    # is the shell's leather. Two clean peaks in the hue histogram, blue lacing
    # at 200-230 degrees and pink leather at 310-330.
    "smk": {
        "photo": "images/drive-2026-07/SMK-Web-righty1.jpg",
        "glove_mask": "runs/smk/masks/glove.png",
        "lace_hue": (170, 250),
        "outline": [(760, 40), (850, 25), (960, 55), (1050, 130), (1110, 250),
                    (1140, 400), (1130, 540), (1090, 670), (1030, 800),
                    (965, 910), (900, 985), (830, 1015), (770, 995),
                    (735, 940), (725, 860), (730, 780), (740, 700),
                    (748, 600), (755, 480), (758, 360), (759, 240),
                    (759, 130)],
        "finger_poly": [(760, 40), (759, 130), (759, 240), (758, 360),
                        (755, 480), (748, 600), (740, 700), (730, 780),
                        (725, 860), (735, 940), (770, 995),
                        (700, 980), (660, 925), (650, 850), (658, 770),
                        (668, 690), (676, 590), (682, 470), (686, 350),
                        (687, 230), (688, 120), (688, 40)],
    },
}


def cut(spec):
    im = Image.open(HERE / spec["photo"]).convert("RGB")
    a = np.asarray(im).astype(float)
    lum = a @ [0.299, 0.587, 0.114]
    glove = np.asarray(Image.open(HERE / spec["glove_mask"]).convert("L")) > 127

    def drawn(polys):
        import cv2
        m = np.zeros(glove.shape, np.uint8)
        for poly in polys:
            cv2.fillPoly(m, [np.array(poly, np.int32)], 1)
        return m.astype(bool)

    if "web_polys" in spec and "outline" not in spec:
        # Every piece drawn by hand: the leather, each lace, and the knot that
        # belongs to the glove rather than to the web. Nothing is inferred, so
        # there is nothing here to be wrong about — which is the whole reason
        # for the tracer.
        web = glove & drawn(spec["web_polys"])
        lace = glove & drawn(spec.get("lace_polys", ()))
        if "dark" in spec:
            # Trim the polygons back to their own colour. A lace traced round
            # the outside catches a few pixels of the leather it lies on, and
            # a lace-coloured fringe on a two-tone glove is visible.
            light = lum >= spec["dark"]
            lace &= light if spec.get("leather_is_dark", True) else ~light
        if "knot_polys" in spec:
            tie = drawn(spec["knot_polys"])
            web, lace = web & ~tie, lace & ~tie
            print(f"knotted lace left to the glove: {int(tie.sum())} px")
        web &= ~lace
        print(f"traced: {int(web.sum())} px leather, {int(lace.sum())} px lacing")
        return im, web, lace, None

    if "outline" in spec:
        # Trace the web's boundary and take everything inside it.
        #
        # Hunting for the web by colour does not work on every glove. On the
        # Columbia Spiral I the web's leather runs from V 0.29 in shadow to
        # 0.60 in light, while the shell in shadow drops to 0.60 too — they
        # overlap in every channel, so any threshold either loses half the web
        # or swallows half the glove. Inside a traced outline the problem goes
        # away: the only bright thing in there is lace.
        import cv2
        poly = np.zeros(glove.shape, np.uint8)
        cv2.fillPoly(poly, [np.array(spec["outline"], np.int32)], 1)
        region = glove & poly.astype(bool)
        hsv = np.asarray(im.convert("HSV")).astype(float)
        val = hsv[..., 2] / 255
        # Inside the outline the split is a clean two-way one, so let Otsu
        # find it rather than carrying a hand-tuned number per photograph.
        # Guessing 0.68 here put the shaded laces on the leather side; Otsu
        # says 0.451 for this glove.
        if "lace_hue" in spec:
            # Brightness cannot split these two. On the Standard I and the SMK
            # the web's leather is the same leather as the shell — Columbia
            # blue, pink — and only the lacing differs, so the two sit at the
            # same value and Otsu finds nothing. Hue separates them outright:
            # 205 degrees against 45 on one glove, 340 against 205 on the other.
            hue = np.asarray(im.convert("HSV")).astype(float)[..., 0] * 360 / 255
            lo, hi = spec["lace_hue"]
            islace = ((hue >= lo) & (hue <= hi) if lo <= hi
                      else (hue >= lo) | (hue <= hi))
            web = region & ~islace
            cutv = None
        else:
            cutv = spec.get("lace_v")
            if cutv is None:
                cutv = cv2.threshold((val[region] * 255).astype(np.uint8), 0,
                                     255,
                                     cv2.THRESH_BINARY + cv2.THRESH_OTSU)[0] / 255
                print(f"leather/lace split at V = {cutv:.3f} (Otsu)")
            web = region & (val < cutv)
        web = ndimage.binary_closing(web, np.ones((7, 7), bool))
        web = ndimage.binary_opening(web, np.ones((3, 3), bool))
        lace = region & ~web
        lace = ndimage.binary_opening(lace, np.ones((3, 3), bool))
        lbl, n = ndimage.label(lace)
        sizes = ndimage.sum(lace, lbl, range(1, n + 1))
        lace = np.isin(lbl, np.nonzero(sizes > 120)[0] + 1)
        for poly in spec.get("lace_polys", ()):
            extra = np.zeros(glove.shape, np.uint8)
            cv2.fillPoly(extra, [np.array(poly, np.int32)], 1)
            bright = islace if cutv is None else (val >= cutv)
            lace |= glove & extra.astype(bool) & bright
        # A hand-traced web is the web. Otsu guesses at the boundary between
        # leather and lacing from brightness, and on a glove shot with a flash
        # it guesses raggedly; where Scott has drawn the leather himself, that
        # is the answer and the threshold has nothing left to say about it.
        if "web_polys" in spec:
            drawn = np.zeros(glove.shape, np.uint8)
            for poly in spec["web_polys"]:
                cv2.fillPoly(drawn, [np.array(poly, np.int32)], 1)
            web = glove & drawn.astype(bool) & ~lace
        # The knotted lace belongs to the glove, not to the web: the page
        # draws its own over whichever web is fitted, and a web that carries
        # a second one in its cutout shows two knots in two places.
        if "knot_polys" in spec:
            tie = np.zeros(glove.shape, np.uint8)
            for poly in spec["knot_polys"]:
                cv2.fillPoly(tie, [np.array(poly, np.int32)], 1)
            tie = tie.astype(bool)
            web, lace = web & ~tie, lace & ~tie
            print(f"knotted lace left to the glove: {int(tie.sum())} px")
        finger = None
        if "finger_poly" in spec:
            fp = np.zeros(glove.shape, np.uint8)
            cv2.fillPoly(fp, [np.array(spec["finger_poly"], np.int32)], 1)
            finger = glove & fp.astype(bool) & ~region & ~lace
            finger = ndimage.binary_opening(finger, np.ones((5, 5), bool))
        return im, web, lace, finger


    if "leather_hue" in spec:
        # Brightness alone cannot always tell leather from lace: on the Japan
        # glove the red thumb sits at the same luminance as the navy web, so
        # a threshold hands the thumb to the web. Hue keeps them apart —
        # navy 212 degrees, tan lace 40, red thumb 356.
        hsv = np.asarray(im.convert("HSV")).astype(float)
        hue, sat = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255
        lo, hi = spec["leather_hue"]
        band = (hue >= lo) & (hue <= hi) if lo <= hi else (hue >= lo) | (hue <= hi)
        body = glove & band & (sat >= spec.get("leather_sat", 0.10))
    else:
        dark = glove & (lum < spec["dark"])
        body = dark if spec["leather_is_dark"] else (glove & ~dark)

    lbl, n = ndimage.label(body)
    sizes = ndimage.sum(body, lbl, range(1, n + 1))
    web = lbl == (int(np.argmax(sizes)) + 1)

    # everything on the far side of the welt belongs to the next panel
    pts = spec["seam"]
    bound = np.interp(np.arange(web.shape[0]),
                      [p[0] for p in pts], [p[1] for p in pts])
    cols = np.arange(web.shape[1])[None, :]
    keep = cols >= bound[:, None]
    web &= keep

    lbl, n = ndimage.label(web)
    sizes = ndimage.sum(web, lbl, range(1, n + 1))
    web = lbl == (int(np.argmax(sizes)) + 1)
    web = ndimage.binary_closing(web, np.ones((7, 7), bool))

    for x0, y0, x1, y1 in spec.get("loops", ()):
        box = np.zeros_like(web)
        box[y0:y1, x0:x1] = True
        web |= body & box
    for poly in spec.get("loop_polys", ()):
        import cv2
        region = np.zeros(web.shape, np.uint8)
        cv2.fillPoly(region, [np.array(poly, np.int32)], 1)
        web |= body & region.astype(bool)

    # The lacing is whatever sits in the web's outline and is not leather —
    # but taken as whole pieces, not clipped to the outline. The loops round
    # the rim straddle it, and half a loop rendered is worse than none: the
    # outer half would stay the old web's colour while the inner half changed.
    hull = ndimage.binary_fill_holes(
        ndimage.binary_closing(web, np.ones((45, 45), bool))) & keep
    light = glove & ~body
    light = ndimage.binary_opening(light, np.ones((3, 3), bool))
    lbl, n = ndimage.label(light)
    sizes = ndimage.sum(light, lbl, range(1, n + 1))
    inside = ndimage.sum(light & hull, lbl, range(1, n + 1))
    # a piece is web lacing if it reaches into the outline and is lace-sized:
    # the shell beside the web touches it too, and is twenty times bigger
    cap = spec.get("lace_max", 20000)
    take = np.nonzero((inside > 60) & (sizes > 120) & (sizes < cap))[0] + 1
    lace = np.isin(lbl, take)
    return im, web, lace, None


def rgba(im, mask):
    a = np.dstack([np.asarray(im), (mask * 255).astype(np.uint8)])
    return Image.fromarray(a, "RGBA")


def quad(mask):
    """Corners of the mask's minimum-area rectangle, top-left first, clockwise.

    Ordering by angle alone is not enough: two quads of different shape can
    start their loop at different corners, and then the homography pairs
    top-left with bottom-left and quietly rotates everything. Anchoring the
    start at the corner nearest the origin makes the correspondence between
    any two quads well defined.
    """
    import cv2
    cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL,
                             cv2.CHAIN_APPROX_SIMPLE)
    box = cv2.boxPoints(cv2.minAreaRect(max(cs, key=cv2.contourArea)))
    ctr = box.mean(0)
    box = box[np.argsort(np.arctan2(box[:, 1] - ctr[1], box[:, 0] - ctr[0]))]
    start = int(np.argmin(box.sum(1)))
    return np.roll(box, -start, axis=0).astype(np.float32)


def aperture(height=1100):
    """The opening a web has to fill on the reference glove.

    Everything inside the glove's outline that no other part of it occupies:
    the stock web's leather and, just as importantly, the gaps in the stock
    web, which are background showing through and so belong to the opening
    rather than to the glove. Taken as the largest such region, which leaves
    the hairline gaps between panels out of it.
    """
    lay = HERE / "layers/rainbow-back-4x"

    def α(name):
        im = Image.open(lay / f"{name}.png").convert("RGBA")
        w = int(im.width * height / im.height)
        return np.asarray(im.resize((w, height), Image.LANCZOS))[..., 3] > 40

    outer = ndimage.binary_fill_holes(α("glove"))
    other = np.zeros_like(outer)
    for p in sorted(lay.glob("*.png")):
        # not the lacing: it runs straight across the opening, and counting it
        # as glove chops the opening into fragments — the largest of which is
        # a seventh of the real thing. Where a lace crosses a panel the panel
        # already claims that ground, so leaving it out costs nothing.
        # `*_cutout` are the same panels again, before trimming, and web_cutout
        # covers the whole opening — leaving them in shrinks the aperture to a
        # twentieth of itself.
        # `web_material` is generated INTO this folder, so leaving it in
        # counted it as another panel and collapsed the aperture to 2% of
        # itself the moment it existed.
        if p.stem.endswith("_cutout") or p.stem in ("glove", "web", "laces",
                                                    "bullet_logo",
                                                    "web_material",
                                                    "laces_material"):
            continue
        other |= α(p.stem)
    free = outer & ~ndimage.binary_dilation(other, np.ones((3, 3), bool))
    lbl, n = ndimage.label(free)
    if not n:
        return free
    big = 1 + int(np.argmax(ndimage.sum(free, lbl, range(1, n + 1))))
    return ndimage.binary_fill_holes(lbl == big)


def complete(leather, have, ap, finger=None, min_window=1200):
    """Fill the web out to the edges of the opening it sits in.

    A cutout warped into the opening never quite reaches its corners, and what
    it leaves behind is background: black holes between the web and the finger
    it is stitched to. Scott, looking at all four: "there's still a lot of web
    missing from all of the webs... the webs are way more visible than how
    they are right now."

    A web's own windows have to survive it, so the only gaps kept open are the
    ones a web actually has: enclosed by the web on every side, big enough to
    be a window rather than a ragged edge, and away from the index finger. A
    gap against the finger is the cutout falling short of the seam it is sewn
    to, never a window — no web is open where it is stitched on.

    Everything else in the opening becomes leather, carried in from the
    nearest real pixel the web has.
    """
    a = np.asarray(leather).copy()
    closed = ndimage.binary_closing(have, np.ones((9, 9), bool))
    hole = ndimage.binary_fill_holes(closed) & ~closed
    lbl, n = ndimage.label(hole)
    sizes = ndimage.sum(hole, lbl, range(1, n + 1)) if n else np.zeros(0)
    keep = set(1 + np.nonzero(sizes >= min_window)[0])
    if finger is not None and finger.any():
        seam = ndimage.binary_dilation(finger, np.ones((3, 3), bool),
                                       iterations=3)
        keep -= set(np.unique(lbl[hole & seam]).tolist())
    window = np.isin(lbl, sorted(keep))
    add = ap & ~have & ~window
    if not add.any():
        return leather, 0
    have = a[..., 3] > 90          # leather only, to copy leather in
    iy, ix = ndimage.distance_transform_edt(~have, return_indices=True,
                                            return_distances=False)
    a[..., :3][add] = a[..., :3][iy[add], ix[add]]
    a[..., 3][add] = 255
    soft = ndimage.uniform_filter(a[..., :3].astype(np.float32), size=(5, 5, 1))
    inner = ndimage.binary_erosion(add, np.ones((3, 3), bool))
    a[..., :3][inner] = soft[inner].astype(np.uint8)
    return Image.fromarray(a, "RGBA"), int(add.sum())


def straighten(img):
    """Trim a layer's left edge back to the straight line through its ends.

    The finger strip is traced by hand, so its outer edge wanders, and on the
    glove that wander is the only thing marking where one photograph stops and
    the other starts. A homography maps straight lines to straight lines, so
    cutting it straight here leaves it straight on the glove.

    This only ever removes pixels — the edge is pulled in to the line, never
    invented out to it.
    """
    a = np.asarray(img).copy()
    m = a[..., 3] > 90
    rows = np.nonzero(m.any(1))[0]
    if len(rows) < 20:
        return img
    y0, y1 = int(rows[0]), int(rows[-1])
    x0 = float(np.nonzero(m[y0])[0].min())
    x1 = float(np.nonzero(m[y1])[0].min())
    ys = np.arange(a.shape[0], dtype=np.float32)
    bound = x0 + (x1 - x0) * (ys - y0) / max(y1 - y0, 1)
    cols = np.arange(a.shape[1])[None, :]
    a[..., 3] = np.where(cols >= bound[:, None], a[..., 3], 0)
    return Image.fromarray(a, "RGBA")


def fit(layers, web_mask, height=1100, extend=0.06, finger=None,
        lean=0.55):
    """Warp a cutout onto the reference glove's web aperture.

    Not a stretch — a perspective transform. The reference glove is
    photographed at more of an angle than these webs are, so its web is
    foreshortened; the same foreshortening has to be applied to anything
    dropped into that opening or it sits there too wide.
    """
    import cv2
    ref_im = Image.open(HERE / "layers/rainbow-back-4x/web.png").convert("RGBA")
    w = int(ref_im.width * height / ref_im.height)
    ref = np.asarray(ref_im.resize((w, height), Image.LANCZOS))[..., 3] > 90
    dst = quad(ref)
    # Run the bottom of the web on past the opening so it disappears under the
    # knotted lace instead of stopping just short of it. That lace is on the
    # outside of the glove and draws over the web, so the overshoot is hidden.
    if extend:
        ctr = dst.mean(0)
        low = np.argsort(dst[:, 1])[-2:]
        dst[low] += (dst[low] - ctr) * extend
    # With a finger edge in the cutout, the destination is not the web
    # opening any more — it is the opening plus the strip of index finger the
    # cutout carries. Building it that way keeps both quads' right-hand edges
    # on the same thing, the outer rim, so the web cannot be dragged off it.
    #
    # Pinning the finger edge to back 3 with a solver did align that edge, but
    # it sheared the whole quad and pulled the bottom-right 50 px in off the
    # rim. The band's width is taken from the photograph instead: however wide
    # the finger is relative to the web there, it is that wide here.
    src = web_mask
    if finger is not None and finger.any():
        src = web_mask | finger
        b3_im = Image.open(HERE / "layers/rainbow-back-4x/back3.png").convert("RGBA")
        b3 = np.asarray(b3_im.resize((w, height), Image.LANCZOS))[..., 3] > 90
        # how thick the finger band is in the photograph, as a fraction of
        # the web's width there — measured row by row, because the lace runs
        # out past both and would swamp a bounding-box measurement
        rows = [r for r in range(finger.shape[0]) if finger[r].any()]
        thick = float(np.median([np.count_nonzero(finger[r]) for r in rows]))
        wrows = [r for r in range(web_mask.shape[0]) if web_mask[r].any()]
        wwide = float(np.median([np.ptp(np.nonzero(web_mask[r])[0])
                                 for r in wrows]))
        span = lambda m: float(np.ptp(np.nonzero(m)[1]))
        band = span(ref) * thick / max(wwide, 1.0)
        edge = np.nonzero(b3)[1].max()
        cols = np.arange(w)[None, :]
        dst = quad(ref | (b3 & (cols > edge - band)))
        print(f"finger band {band:.0f} px of back 3 joins the opening")
    M = cv2.getPerspectiveTransform(quad(src), dst)

    # Nothing out of a cutout may render outside the glove. Warped freely, the
    # finger strip put 4,500 px past the silhouette — a bulge down the side of
    # the index finger where every other finger has a clean edge. Clipping to
    # the glove's own outline tucks it under the finger instead of hanging off
    # it, and the finger keeps the shape it always had.
    sil_im = Image.open(HERE / "layers/rainbow-back-4x/glove.png").convert("RGBA")
    sil = np.asarray(sil_im.resize((w, height), Image.LANCZOS))[..., 3]
    sil = (ndimage.binary_erosion(sil > 40, np.ones((3, 3), bool))
           * 255).astype(np.uint8)

    out = {}
    for n, im in layers.items():
        a = cv2.warpPerspective(np.asarray(im), M, (w, height),
                                flags=cv2.INTER_LANCZOS4)
        a[..., 3] = np.minimum(a[..., 3], sil)
        out[n] = Image.fromarray(a, "RGBA")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", required=True, choices=sorted(WEBS))
    args = ap.parse_args()
    spec = WEBS[args.web]
    im, web, lace, finger = cut(spec)

    out = HERE / "runs" / f"web-{args.web}"
    out.mkdir(parents=True, exist_ok=True)
    layers = {"leather": rgba(im, web), "lace": rgba(im, lace)}
    if finger is not None and finger.sum() > 500:
        layers["finger"] = rgba(im, finger)
    for n, layer in layers.items():
        layer.save(out / f"{n}.png")

    aligned = fit(layers, web | lace, finger=finger)
    have = np.zeros((0,), bool)
    for layer in aligned.values():
        a = np.asarray(layer)[..., 3] > 90
        have = a if have.shape != a.shape else (have | a)
    fing = (np.asarray(aligned["finger"])[..., 3] > 90
            if "finger" in aligned else None)
    aligned["leather"], added = complete(
        aligned["leather"], have, aperture(), finger=fing,
        min_window=np.inf if spec.get("closed") else 1200)
    print(f"web completed out to the opening: {added} px added")
    # The shape is this web's, traced by hand. The MATERIAL is this glove's,
    # so every web is cut out of one piece of leather under one light at one
    # angle. That is the whole fix: the borrowed pixels — another glove, another
    # flash, another camera position, then a homography and a smeared hole
    # fill — were what made the webs read as collage. Keep the alpha, replace
    # the colour.
    mat = Image.open(HERE / "layers/rainbow-back-4x/web_material.png")
    mat = mat.convert("RGBA").resize(aligned["leather"].size, Image.LANCZOS)
    mrgb = np.asarray(mat)[..., :3]
    lmat = Image.open(HERE / "layers/rainbow-back-4x/laces_material.png")
    lmat = lmat.convert("RGBA").resize(aligned["leather"].size, Image.LANCZOS)
    lrgb = np.asarray(lmat)[..., :3]
    for n, src in (("leather", mrgb), ("finger", mrgb), ("lace", lrgb)):
        if n not in aligned:
            continue
        arr = np.asarray(aligned[n]).copy()
        arr[..., :3] = src
        aligned[n] = Image.fromarray(arr, "RGBA")
    print("cut from the glove's own web leather")

    if "finger" in aligned:
        aligned["finger"] = straighten(aligned["finger"])
    # where build_assets.py picks them up, alongside the glove's own layers
    lay = HERE / "layers" / "webs" / args.web
    lay.mkdir(parents=True, exist_ok=True)
    base = Image.open(HERE / "customiser/assets/glove.webp").convert("RGBA")
    for n, layer in aligned.items():
        layer.save(out / f"{n}_aligned.png")
        layer.save(lay / f"{n}.png")
        base.alpha_composite(layer)
    base.convert("RGB").save(out / "fit.jpg", quality=92)

    ov = np.asarray(im).copy()
    if finger is not None:
        ov[finger] = (0.35 * ov[finger]
                      + 0.65 * np.array([250, 200, 40])).astype(np.uint8)
    ov[web] = (0.35 * ov[web] + 0.65 * np.array([255, 60, 60])).astype(np.uint8)
    ov[lace] = (0.35 * ov[lace] + 0.65 * np.array([60, 230, 90])).astype(np.uint8)
    Image.fromarray(ov).save(out / "check.jpg", quality=92)

    ys, xs = np.nonzero(web)
    report = {"web": args.web, "photo": spec["photo"],
              "leather_px": int(web.sum()), "lace_px": int(lace.sum()),
              "finger_px": int(finger.sum()) if finger is not None else 0,
              "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]}
    (out / "report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    print(f"wrote {out}/ — look at check.jpg before trusting it")


if __name__ == "__main__":
    main()
