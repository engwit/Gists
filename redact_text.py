#!/usr/bin/python2.7
"""
This Gimp plugin redacts the text found in the current selection box and
creates a new text layer at the same location as the masked out text.

Author: Kyle Crouse (kacrouse) for Engineering with IT (engwit)

TO USE THIS PLUGIN:
1. Place this file in '~/.gimp/plugins' or in '/usr/lib/gimp/plugins'.
2. Restart Gimp if it is already running.
3. Draw a selection box around the text to be redacted. The script will work
only if the background of the text is a solid color.
4. Run the script by clicking 'Image > Redact Text...' in the menu.
5. Input the desired replacement text.
6. Click OK.

TIPS:
- To set the font for the replacement text, select the Text Tool, then modify
the font in the Tool Options tab.

Useful resources in writing this script:
- https://www.gimp.org/docs/python/
- http://gimpbook.com/scripting/
- http://developer.gimp.org/api/2.0/libgimpbase/
"""
from gimpfu import *


def redact_text(img, drawable, text):
    # Get bounds of current selection
    non_empty, sel_x1, sel_y1, sel_x2, sel_y2 = pdb.gimp_selection_bounds(img)
    if not non_empty:
        return

    # Set up an undo group, so the operation will be undone in one step.
    pdb.gimp_image_undo_group_start(img)

    # Push a new context onto the stack
    gimp.context_push()

    try:
        # Get layers or create if necessary
        base_layer = img.layers[-1]
        mask_layer = filter(lambda layer: layer.name == "Mask", img.layers)
        if not mask_layer:
            # Create mask layer
            mask_layer = gimp.Layer(
                img, "Mask", img.width, img.height, RGBA_IMAGE, 100, NORMAL_MODE)

            # Insert mask layer at the top
            img.add_layer(mask_layer, 0)
        else:
            mask_layer = mask_layer[0]  # because filter returns a list

        selection = RedactionSelection(img, base_layer, mask_layer,
                                       (sel_x1, sel_y1, sel_x2, sel_y2))

        # Mask out original text
        gimp.set_background(selection.bkg_color)
        pdb.gimp_edit_bucket_fill(
            mask_layer, BG_BUCKET_FILL, NORMAL_MODE, 100, 0, TRUE, 0, 0)

        # Create new text layer
        ctx_font = pdb.gimp_context_get_font()
        text_layer = pdb.gimp_text_layer_new(
            img, text, ctx_font, selection.font_size, PIXELS)
        img.add_layer(text_layer, 0)
        pdb.gimp_text_layer_set_color(text_layer, selection.txt_color)
        pdb.gimp_layer_set_offsets(text_layer, selection.txt_x1,
                                   selection.txt_y1 +
                                   selection.get_text_vert_offset(text, ctx_font))

    finally:
        # Return to the user's context prior to running this plugin
        gimp.context_pop()

        # Close the undo group.
        pdb.gimp_image_undo_group_end(img)


class RedactionSelection():

    def __init__(self, img, base_layer, mask_layer, bounds):
        self.img = img
        self.base_layer = base_layer
        self.mask_layer = mask_layer
        self.bounds = bounds
        self.x1, self.y1, self.x2, self.y2 = bounds
        self.bkg_color = self.find_bkg_color()
        self.txt_color,
            self.txt_x1,
            self.txt_y1,
            self.txt_x2,
            self.txt_y2 = self.find_text_attrs()
        self.txt_bounds = (self.txt_x1, self.txt_y1, self.txt_x2, self.txt_y2)
        self.font_size = self.get_font_size()

    def find_bkg_color(self):
    """
    Background color assumed to be the top left pixel of the selection box.
    """
        # returning only the channel values
        return pdb.gimp_drawable_get_pixel(self.base_layer,
                                           self.x1, self.y1)[1][0:3]

    def find_text_attrs(self):
    """
    Finds and returns both the boundaries and color of the text.
    """
        # text boundaries
        txt_x1 = self.x2
        txt_y1 = self.y2
        txt_x2 = self.x1
        txt_y2 = self.y1

        # to keep a running count non-background color pixel frequency
        colors = dict()

        for x in range(self.x1, self.x2):
            for y in range(self.y1, self.y2):
                pixel_color = pdb.gimp_drawable_get_pixel(
                    self.base_layer, x, y)[1][0:3]
                if pixel_color != self.bkg_color:
                    # update bounds
                    if x < txt_x1:
                        txt_x1 = x
                    if y < txt_y1:
                        txt_y1 = y
                    if x > txt_x2:
                        txt_x2 = x
                    if y > txt_y2:
                        txt_y2 = y

                    # update color count
                    if pixel_color in colors:
                        colors[pixel_color] += 1
                    else:
                        colors[pixel_color] = 0

        # find most frequent color
        mx = 0
        for c in colors:
            if colors[c] > mx:
                mx = colors[c]
                mx_color = c

        return mx_color, txt_x1, txt_y1, txt_x2, txt_y2

    def get_font_size(self):
    """
    Font size determined by the height of the bounding box of the text
    multiplied by a factor determined through trial and error.

    Possible improvement: use optical character recognition to recognize
    the text, match exact size using get-extents pdb function, then put in
    replacement text at determined size
    """
        return (self.txt_y2 - self.txt_y1) * 1.2


    def get_text_vert_offset(self, text, font):
    """
    Determines the pixel offset necessary to center new text vertically over the
    old text.
    """
        _, text_height, _, _ = pdb.gimp_text_get_extents_fontname(
            text, self.font_size, PIXELS, font)
        return int((self.txt_y2 - self.txt_y1) / 2 - text_height / 2)


register(
    "redact_text",
    "Masks the text found in the current selection box and creates a text layer over the previous text.",
    "Draw a selection box around the text to be redacted, input replacement text if desired. The script will function properly only if the background to the text is a solid color.",
    "Kyle Crouse",
    "EngwIT",
    "2016",
    "<Image>/Image/Redact Text...",
    "*",
    [
        (PF_STRING, "text", "Replacement Text", "XXXXXXXX"),
    ],
    [],
    redact_text)

main()
