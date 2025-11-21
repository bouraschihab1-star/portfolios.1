/**
 * Gridstack action event listener function to help with debugging
 *
 * Due to the asynchronous nature of Gridstack, it can be difficult to
 * track down where things are happening and end up doubling code in places.
 * gridevents.js is a tool also used by the developers of Gridstack to
 * debug and track events.
 *
 * Prints out in the browser console, the information that changes.
 * Take from the Gridstack repo demos.
 *
 * @param {*} grid
 * @param {*} id
 */
function addGridstackEventsLogging(grid, id) {
    let displayLogging = false;

    if (!displayLogging) {
        return;
    }

    let g = (id !== undefined ? 'grid' + id + ' ' : '');

    grid.on('added removed change', function(event, items) {
        let str = '';
        items.forEach(function (item) {
            str += ' (' + 'block_' + item.id + ',' + item.x + ',' + item.y + ' ' + item.w + 'x' + item.h + ')';
        });
        displayLogging && console.log(g + event.type + ' ' + items.length + ' items (block_id, x,y w h):' + str);
    })
    .on('enable', function(event) {
        let grid = event.target;
        displayLogging && console.log(g + 'enable');
    })
    .on('disable', function(event) {
        let grid = event.target;
        displayLogging && console.log(g + 'disable');
    })
    .on('dragstart', function(event, el) {
        let node = el.gridstackNode;
        let x = el.getAttribute('gs-x'); // verify node (easiest) and attr are the same
        let y = el.getAttribute('gs-y');
        // displayLogging && console.log(g + 'dragstart ' + el.textContent + ' pos: (' + node.x + ',' + node.y + ') = (' + x + ',' + y + ')');
        displayLogging && console.log(g + 'dragstart ' + ' pos: (' + node.x + ',' + node.y + ') = (' + x + ',' + y + ')');
    })
    .on('drag', function(event, el) {
        let node = el.gridstackNode;
        let x = el.getAttribute('gs-x'); // verify node (easiest) and attr are the same
        let y = el.getAttribute('gs-y');
        // displayLogging && console.log(g + 'drag ' + el.textContent + ' pos: (' + node.x + ',' + node.y + ') = (' + x + ',' + y + ')');
        displayLogging && console.log(g + 'drag ' + ' pos: (' + node.x + ',' + node.y + ') = (' + x + ',' + y + ')');
    })
    .on('dragstop', function(event, el) {
        let node = el.gridstackNode;
        let x = el.getAttribute('gs-x'); // verify node (easiest) and attr are the same
        let y = el.getAttribute('gs-y');
        // displayLogging && console.log(g + 'dragstop ' + el.textContent + ' pos: (' + node.x + ',' + node.y + ') = (' + x + ',' + y + ')');
        displayLogging && console.log(g + 'dragstop ' + ' pos: (' + node.x + ',' + node.y + ') = (' + x + ',' + y + ')');
    })
    .on('dropped', function(event, previousNode, newNode) {
        if (previousNode) {
            displayLogging && console.log(g + 'dropped - Removed widget from grid:', previousNode);
        }
        if (newNode) {
            displayLogging && console.log(g + 'dropped - Added widget in grid:', newNode);
        }
    })
    .on('resizestart', function(event, el) {
        let n = el.gridstackNode;
        let rec = el.getBoundingClientRect();
        displayLogging && console.log(`${g} resizestart ${el.textContent} size: (${n.w}x${n.h}) = (${Math.round(rec.width)}x${Math.round(rec.height)})px`);

    })
    .on('resize', function(event, el) {
        let n = el.gridstackNode;
        let rec = el.getBoundingClientRect();
        displayLogging && console.log(`${g} resize ${el.textContent} size: (${n.w}x${n.h}) = (${Math.round(rec.width)}x${Math.round(rec.height)})px`);
    })
    .on('resizestop', function(event, el) {
        let n = el.gridstackNode;
        let rec = el.getBoundingClientRect();
        displayLogging && console.log(`${g} resizestop ${el.textContent} size: (${n.w}x${n.h}) = (${Math.round(rec.width)}x${Math.round(rec.height)})px`);
    });
}