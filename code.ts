// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).


async function invertImages(node) {
  const newFills = []
  let hasImage = false;
  for (const paint of node.fills) {
    if (paint.type === 'IMAGE') {
      hasImage = true;
      // Get the (encoded) bytes for this image.
      const image = figma.getImageByHash(paint.imageHash)
      const bytes = await image.getBytesAsync()

      // Create an invisible iframe to act as a "worker" which
      // will do the task of decoding and send us a message
      // when it's done.
      figma.showUI(__html__, { visible: false })

      // Send the raw bytes of the file to the worker.
      figma.ui.postMessage({type: 'invert', bytes: bytes})

      // Wait for the worker's response.
      const newBytes = await new Promise((resolve, reject) => {
        figma.ui.onmessage = value => resolve(value.bytes)
      })

      // Create a new paint for the new image.
      const newPaint = JSON.parse(JSON.stringify(paint))
      newPaint.imageHash = figma.createImage(newBytes).hash
      newFills.push(newPaint)
    }
  }
  
  if (hasImage) {
    node.fills = newFills
  }
  figma.closePlugin();
}

// Assume the current selection has fills.
// In an actual plugin, this won't necessarily be true!
if (figma.currentPage.selection.length > 0) {
  const selected = figma.currentPage.selection[0] as GeometryMixin
  invertImages(selected)
} else {
  // This shows the HTML page in "ui.html".
  figma.showUI(__html__);

  // Can also have hidden-mode UI just for the sake of message passing to use browser APIs like network...
  // figma.showUI(__html__, { visible: false })

  // Calls to "parent.postMessage" from within the HTML page will trigger this
  // callback. The callback will be passed the "pluginMessage" property of the
  // posted message.
  figma.ui.onmessage = msg => {
    // One way of distinguishing between different types of messages sent from
    // your HTML page is to use an object with a "type" property like this.
    if (msg.type === 'create-rectangles') {
      const nodes: SceneNode[] = [];
      for (let i = 0; i < msg.count; i++) {
        const rect = figma.createRectangle();
        rect.x = i * 150;
        rect.fills = [{type: 'SOLID', color: {r: Math.random(), g: Math.random(), b: Math.random()}}];
        figma.currentPage.appendChild(rect);
        nodes.push(rect);
      }
      figma.currentPage.selection = nodes;
      figma.viewport.scrollAndZoomIntoView(nodes);
    }

    // images are stored in the fill of a node

    // can also send code to the UI
    figma.ui.postMessage(42);

    // Make sure to close the plugin when you're done. Otherwise the plugin will
    // keep running, which shows the cancel button at the bottom of the screen.
    figma.closePlugin();
  };
}