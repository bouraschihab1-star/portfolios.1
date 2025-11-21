/**
 * Javascript for the views interface
 *
 * @package    mahara
 * @subpackage core
 * @author     Catalyst IT Limited <mahara@catalyst.net.nz>
 * @license    https://www.gnu.org/licenses/gpl-3.0.html GNU GPL version 3 or later
 * @copyright  For copyright information on Mahara, please see the README file distributed with this software.
 * @copyright  (C) 2013 Mike Kelly UAL m.f.kelly@arts.ac.uk
 *
 */

/**
 * Extra inline JavaScript
 *
 * Now that gridstack is not connected with jQuery the
 * the inline javascript doesn't get executed as page is already loaded in jQuery land
 * so we need to find the inline js and enable it to run at this point
 * - similar code to what we use in js/views.js
 *
 * @param {Array<GridStackNode>} gridNodes
 */
function addGridNodesInlineJS(gridNodes) {
    gridNodes.forEach(gridNode => {
        if (gridNode.el.id) {
            const html = $('#' + gridNode.el.id).prop('innerHTML');
            const temp = $('<div>').append(html);
            let inlineJs = '';
            temp.find('*').each(function() {
                if ($(this).prop('nodeName') === 'SCRIPT' && $(this).prop('src') === '') {
                    inlineJs += $(this).prop('innerHTML');
                }
            });
            if (inlineJs) {
                eval(inlineJs);
            }
        }
    });
}

/**
 * Resize blocks on a page from the old layout
 *
 * When page was copied from an old layout page, the blocks need to be resized
 * Handling ('added', 'resizestart', and 'resizestop') grid events
 *
 * @param {GridStack} grid
 * @param {Array<Object>} blocks
 *
 * Object blocks {
 *     column: <>,
 *     content: <>,
 *     draft: <>,
 *     height: <>,
 *     id: <>,
 *     order: <>,
 *     positionx: <>,
 *     positiony: <>,
 *     row: <>,
 *     width: <>
 * }
 *
 */
function updateOldLayout(grid, blocks) {
    window.isGridstackRendering = true;
    gridRemoveEvents();

    // Load grid with empty blocks
    $.each(blocks, function(index, block) {
        let minHeight = null;

        let blockContent = block.content;
        let blockHeight = block.height;
        let blockPositionX = block.positionx;
        let blockPositionY = block.positiony;
        let blockWidth = block.width;
        let blockId = block.id;
        let blockClass = block.class;

        if (blockContent == null) {
            blockContent = '';
        }
        else {
            if (!$(blockContent).children().hasClass('collapse')) {
                minHeight = blockHeight;
            }
        }
        let gridItemElement = '<div id="block_' + blockId + '"><div class="grid-stack-item-content">'
            + blockContent +
            '</div></div>';

        let widgetOptions = {
            x: blockPositionX,
            y: blockPositionY,
            w: blockWidth,
            h: blockHeight,
            minW: null,
            maxW: null,
            minH: minHeight,
            maxH: null,
            id: blockId,
            autoPosition: true,
        }

        let el = grid.addWidget(
            gridItemElement,
            widgetOptions
        );

        $(el).addClass(blockClass);
    });

    jQuery(document).trigger('blocksloaded');

    // Block resizing to fit content.
    // Wait until images (if any) have been loaded so that heights can
    // be calculated correctly.
    jQuery('.grid-stack').imagesLoaded().always(function() {
        resizeBlockHeightsToFitContent();
        updateTranslatedGridRows(blocks);
        setUpPreventDefaultOnChangeGrid();
        initJs();
        window.isGridstackRendering = false;
    });
}

/**
 * Load the blocks on the given Gridstack grid
 *
 * @param {GridStack} grid
 * @param {Array<Object>} blocks
 *  Object {
 *      column,
 *      content,
 *      height,
 *      id,
 *      order,
 *      positionx,
 *      positiony,
 *      row,
 *      width,
 *  }
 */
function loadGrid(grid, blocks) {

    let minHeight;
    let draftClass;
    let srElement;
    let positionX;
    let positionY;
    let blockId;
    let blockIsDraft;
    let blockWidth;
    let blockHeight;
    let blockClass;

    let dimensions;

    window.isGridstackRendering = true;
    grid.batchUpdate();

    // figure out if it's oneColumn
    var isOneColumn = grid._widthOrContainer() <= grid.opts.columnOpts.breakpoints[0].w;
    var oneColumnNextPositionY = 0;

    blocks.forEach(block => {

        minHeight = null;
        draftClass = '';
        srElement = '';

        positionX = block.positionx;
        positionY = block.positiony;
        blockContent = block.content;
        blockId = block.id;
        blockIsDraft = block.draft;
        blockWidth = block.width;
        blockClass = block.class;
        blockHeight = block.height;

        // Debug loading for GridStack
        // console.log('id: ' + blockId + ' ' + 'x: ' + positionX + ' ', 'y: ' + positionY);

        if (blockContent == null) {
            blockContent = '';
        }
        else if (!$(blockContent).children().hasClass('collapse')) {
            minHeight = blockHeight;
        }

        if (typeof (blockIsDraft) != 'undefined' && blockIsDraft) {
            draftClass = 'draft';
            srElement = '<span class="visually-hidden">' + get_string('draft') + '</span>';
        }

        // GridItemHTMLElement: gridHtmlElement
        let gridHtmlElement = '<div id="block_' + blockId + '" class="grid-stack-item" >'
            + srElement +
            '<div class="grid-stack-item-content ' + draftClass + '">'
            + blockContent +
            '</div></div>';

        if (isOneColumn) {
            if (positionY === "0") {
                oneColumnNextPositionY = parseInt(positionY);
            }

            dimensions = {
                positionx: positionX,
                positiony: toString(oneColumnNextPositionY),
                width: blockWidth,
                height: blockHeight
            }
            addNewWidget(gridHtmlElement, blockId, dimensions, grid, blockClass, minHeight);
            oneColumnNextPositionY += parseInt(blockHeight);
        }
        else {
            dimensions = {
                positionx: positionX,
                positiony: positionY,
                width: blockWidth,
                height: blockHeight
            }
            addNewWidget(gridHtmlElement, blockId, dimensions, grid, blockClass, minHeight);

        }

    });
    grid.batchUpdate(false);
    jQuery(document).trigger('blocksloaded');

    cleanUpJS();
    // Add JS listeners and actions.
    initJs();

    // Wait until images (if any) have been loaded so that heights can
    // be calculated correctly.
    //
    // TODO: Code is located here so that 'grid' is bound, but we could
    // pass 'grid' to initJs() and move this there?
    $('.grid-stack').imagesLoaded().always(function() {
        // no need to update the blocksizes for hidden timeline views
        const blockId = $(grid.el).attr('id');
        if (typeof blockId === 'undefined') {
            resizeBlockHeightsToFitContent();
        }
        window.isGridstackRendering = false;
    });
}

const timelineGridOptions = {
    ...DEFAULT_GRID_OPTIONS,
    staticGrid: true,
};

/**
 * There are special cases such as for internalmedia / embedded media block
 * that uses JS that needs to be cleaned up before it can be recreated e.g. videojs
 *
 */
function cleanUpJS() {
    // Dispose the block videojs player if exists
    try {
        var players = videojs.players;
        Object.keys(players).forEach(key=>{
            players[key].dispose();
        });
    }
    catch (err) {}
}

/**
 * Preps for viewing mode
 *
 * Warns the viewer that the blocks may appear out of order for responsiveness
 */
function setupViewMode() {
    const grid = document.querySelector('.grid-stack').gridstack;
    var isOneColumn = grid._widthOrContainer() <= grid.opts.columnOpts.breakpoints[0].w;

    if (isOneColumn) {
    }
}

/**
 * Add JS listeners and actions
 *
 * - on ('colresize', 'hidden.bs.collapse shown.bs.collapse', 'timelineviewresizeblocks')
 */
function initJs() {
    if (config.editMode) {
        setupEditMode();
    }
    else {
        setupViewMode();
    }

    $(window).on('colresize', function(e) {
        let closestGridElement = $(e.target).closest('.grid-stack');
        let id = closestGridElement.attr('id');
        // check we are not in timeline view
        if (typeof id === 'undefined') {
            resizeBlockHeightsToFitContent();
        }
        else {
            // on timeline view
            GridStack.init(timelineGridOptions, closestGridElement[0]);
            resizeBlockHeightsToFitContent(closestGridElement);
        }
    });

    $(window).on('hidden.bs.collapse shown.bs.collapse', function(e) {
        let closestGridElement = $(e.target).closest('.grid-stack');
        let id = closestGridElement.attr('id');
        // ignore if we are not inside a grid
        if (closestGridElement.length > 0) {
            // check we are not in timeline view
            if (typeof id === 'undefined') {
                resizeBlockHeightsToFitContent();
            }
            else {
                // on timeline view
                GridStack.init(timelineGridOptions, closestGridElement[0]);
                resizeBlockHeightsToFitContent(closestGridElement);
            }
        }
    });

    $(window).on('timelineviewresizeblocks', function() {
        let timelineDiv = document.querySelector('.lineli.selected .container-fluid .grid-stack');
        GridStack.init(timelineGridOptions, timelineDiv);
        let timelineGridElement = $('#' + timelineDiv.id);
        timelineGridElement.imagesLoaded().always(function() {
            resizeBlockHeightsToFitContent(timelineGridElement);
        });
    });
}

/**
 * Parse and save the grid items on a updated grid
 *
 * Use case: Update from old layout
 *
 * Sends a JSON request to update all related block dimensions in the database.
 *
 * @param {Array<Object>} updatedGrid
 * @param {GridStack} grid
 */
function bulkUpdateOnGrid(updatedGrid, grid) {
    let isOneColumn = grid._widthOrContainer() <= grid.opts.columnOpts.breakpoints[0].w;

    let postData = {
        'id': $('#viewid').val(),
        'blocks': JSON.stringify(updatedGrid),
        'gridonecolumn': isOneColumn
    };
    sendjsonrequest(config['wwwroot'] + 'view/grid.json.php', postData, 'POST');
}

/**
 * Translate blocks from old layout and save
 *
 * Use case: updating from pre-gridstack pages
 *
 * @param {*} blocks
 */
function updateTranslatedGridRows(blocks) {
    let height = [];
    let maxHeight = [];
    let realHeight;
    let updatedGrid = [];

    height[0] = [];
    height[0][0] = 0;
    maxHeight[0] = 0;

    let grid = document.querySelector('.grid-stack').gridstack;
    $.each(blocks, function (key, block) {
        let el, y;

        if (typeof (height[block.row]) == 'undefined') {
            height[block.row] = [];
            height[block.row][0] = 0;
        }
        if (typeof (height[block.row][block.column]) == 'undefined') {
            height[block.row][block.column] = 0;
        }

        y = 0;
        if (block.row > 0) {
            // get the actual y value based on the max height of previous rows
            for (let i = 0; i < block.row; i++) {
                if (typeof (maxHeight[i]) != 'undefined' && !isNaN(maxHeight[i])) {
                    y += maxHeight[i];
                }
            }
        }
        if (typeof (height[block.row][block.column]) != 'undefined') {
            y += height[block.row][block.column];
        }
        block.positiony = y;

        el = $('#block_' + block.id);

        realHeight = parseInt($(el).attr('gs-h'));
        grid.update(el);

        let updatedBlock = {};
        updatedBlock.id = block.id;
        updatedBlock.dimensions = {
            newx: +block.positionx,
            newy: +block.positiony,
            newwidth: +block.width,
            newheight: +realHeight,
        };
        updatedGrid.push(updatedBlock);

        if (height[block.row][block.column] == 0) {
            height[block.row][block.column] = realHeight;
        }
        else {
            height[block.row][block.column] += realHeight;
        }
        // need to filter values that are not numbers
        let allNumbers = height[block.row].filter(function (el) {
            return Number.isInteger(el);
        });
        maxHeight[block.row] = Math.max.apply(null, allNumbers);
    });
    bulkUpdateOnGrid(updatedGrid, grid);
}

/**
 * Update all block sizes on the grid
 *
 * Ensures block heights are tall enough to fit dynamically loaded content
 *
 * Note: Does not send a JSON request to update the database.
 * The effect is client-side only.
 *
 * Note: ui-resizable-resizing class is present on blocks while they are
 * being resized (events 'resizestart' and 'resize', but not 'resizestop').
 * @see node_modules/gridstack/dist/dd-resizable.js
 *
 * @param {GridHTMLElement} htmlElement - contains .grid-stack class
 */
function resizeBlockHeightsToFitContent(htmlElement = undefined) {
    // Ensure gridElement is defined, either passed or default to '.grid-stack'
    let gridElement = typeof htmlElement === 'undefined' ? $('.grid-stack') : htmlElement;
    const grid = gridElement[0].gridstack;
    const gridOptions = grid.opts;
    const gridItemElements = gridElement.children();

    // Iterate over each grid item
    $.each(gridItemElements, function (index, gridItem) {
        const $item = $(gridItem);
        const width = $item.attr('gs-w');
        const prevHeight = $item.attr('gs-h');
        let height = 1;

        const pdfIframe = $item.find('.pdfiframe')[0];

        // Skip resizing if this is a PDF block
        // as those take longer to render and this function will
        // otherwise add extra space to the bottom on every grid change
        if (pdfIframe) {
            resizePdfBlockHeightIfNeeded(gridItem, grid, false);
            return; // Exit the loop early for PDF blocks
        }

        const contentBlock = $item.find(".gridstackblock")[0];
        if (contentBlock) {
            height = Math.ceil(
                ((contentBlock.scrollHeight + gridOptions.margin) / grid.getCellHeight()) + gridOptions.margin
            );

            if (+prevHeight !== height) {
                grid.update(gridItem, { w: width, h: height });
                if (config.editMode) {
                    const blockId = $item.attr('gs-id');
                    const newDimensions = {
                        x: $item.attr('gs-x'),
                        y: $item.attr('gs-y'),
                        height: height,
                        width: width
                    }
                    saveBlockDimensions(blockId, newDimensions, grid);
                }
            }
        }
    });
}

/**
 * Set up Gridstack events
 *
 * @param {*} grid
 */
function setUpGridstackEvents(grid) {
    addGridstackEventsLogging(grid);
    setUpGridstackEventListeners(grid);
}

/**
 * Set up Gridstack actions listeners
 *
 * @param {*} grid
 *
 * @see {GridStackEvent} at
 * https://github.com/gridstack/gridstack.js/tree/master/doc#grid-options
 * There are more in gridevents.js
 */
function setUpGridstackEventListeners(grid) {
    // GridItemHTMLElement: gridItemElement
    grid.on('resizestart', function(event, gridItemElement) {
        grid.update(gridItemElement, {minH: null});
    });
    // Resizing a grid item
    grid.on('resizestop', function(event, gridItemElement) {
        onResizeBlock(event, gridItemElement);
    });
    // Moving a grid item
    grid.on('dragstop', function(event, gridItemElement) {
        saveAllBlocksDimensions();
    });
    // GridStackNode[]: gridNodes
    // Add a grid item
    grid.on('added', function(event, gridNodes) {
        addGridNodesInlineJS(gridNodes);
    });
    // GridStackNode[]: gridNodes
    // On any change to the grid
    grid.on('change', function(event, gridNodes) {
        resizeBlockHeightsToFitContent();
        // Be very careful with this option as it gets triggered when anyone
        // views the page (including anonymous viewers of public pages).
        // We should only save the dimensions when the owner is editing.
    });
}

/**
 * Process changed to the Gridstack grid
 *
 * This includes:
 * - adding a new grid widget item (i.e. new block)
 * - moving blocks
 * - resizing blocks
 *
 * @param {GridItemHTMLElement} gridItemElement A div with class="grid-stack-item"
 * @param {Number} blockId
 * @param {Object} dimensions
 * @param {GridStack} grid
 * @param {String} blocktypeClass
 * @param {Number} minHeight
 */
function addNewWidget(gridItemElement, blockId, dimensions, grid, blocktypeClass, minHeight) {
    let minWidth = grid.opts.minW;
    var customWidth = customWidth < minWidth ? minWidth : customWidth;

    // GridStackWidget: widgetOptions
    let widgetOptions = {
        x: dimensions.positionx,
        y: dimensions.positiony,
        w: dimensions.width,
        h: dimensions.height,
        minW: customWidth,
        maxW: GRIDSTACK_CONSTANTS.desktopWidth,
        minH: minHeight,
        maxH: null,
        id: blockId
    }

    let gridWidget = grid.addWidget(
        gridItemElement,
        widgetOptions
    );

    $(gridWidget).addClass(blocktypeClass);

    // No need to update sizes for timeline views that are hidden.
    //
    // Wait until images (if any) have been loaded so that heights can
    // be calculated correctly.
    $('.grid-stack').imagesLoaded().always(function() {
        const id = $(grid.el).attr('id');
        if (typeof id == 'undefined') {
            resizeBlockHeightsToFitContent();
        }
    });
}

/**
 * Save a the data after updating an existing block on the grid
 *
 * Calls JSON to process the changes for the page
 *
 * @param {Number} blockId
 * @param {Object} newDimensions
 * @param {GridStack} grid
 */
function saveBlockDimensions(blockId, newDimensions, grid) {
    const viewId = $('#viewid').val();
    const isOneColumn = grid._widthOrContainer() <= grid.opts.columnOpts.breakpoints[0].w;

    let postData = {
        'id': viewId,
        'change': 1,
        'gridonecolumn': isOneColumn
    };

    let actionString = '';
    actionString += 'action_moveblockinstance_id_' + blockId;
    actionString += '_newx_' + newDimensions.x;
    actionString += '_newy_' + newDimensions.y;
    actionString += '_newheight_' + newDimensions.height;
    actionString += '_newwidth_' + newDimensions.width;

    postData[actionString] = true;
    sendjsonrequest(config['wwwroot'] + 'view/blocks.json.php', postData, 'POST');
}

/**
 * Iterate through each grid widget item to save its dimensions
 *
 * Save the current positions and sizes of all grid items to the DB
 *
 * See node_modules/gridstack/dist/types.d.ts for definitions:
 * - GridStackNode
 *
 * @param {GridStack} updatedGrid
 * @returns
 */
const saveAllBlocksDimensions = function (updatedGrid = null) {
    let grid = updatedGrid ?? document.querySelector('.grid-stack').gridstack;
    let gridstackNodes = grid.save(false); // same as grid.save() = grid.engine.nodes

    if (typeof (gridstackNodes) == 'undefined') {
        return;
    }

    gridstackNodes.forEach(node => {
        if (typeof node.id == 'undefined') {
            return;
        }

        const blockId = node.id;
        const newDimensions = {
            x: node.x,
            y: node.y,
            height: node.h ?? node.minH,
            width: node.w
        }
        saveBlockDimensions(blockId, newDimensions, grid);
    });
};

/**
 * Resizes the PDF block height based on the rendered page size, but only if the first page is not fully visible.
 * @param {HTMLElement} gridItemElement - The grid item element containing the PDF iframe.
 * @param {Object} grid - The gridstack instance to update the grid item dimensions.
 * @param {boolean} dbsave - The gridstack dimensions in the process of being saved to database.
 * @returns {HTMLElement} The grid item element after resizing.
 */
function resizePdfBlockHeightIfNeeded(gridItemElement, grid, dbsave) {

    const $item = $(gridItemElement);
    const pdfIframe = $item.find('.pdfiframe')[0];

    if (!pdfIframe) return gridItemElement; // Return if no PDF iframe is found

    const pdfIframeOuter = $('#blockinstance_' + $(pdfIframe).prop('id') + '_target');
    // Function to get the rendered page size from PDF.js inside the iframe
    const getPdfPageSize = () => {
        try {
            const iframeDoc = pdfIframe.contentDocument || pdfIframe.contentWindow.document;
            const viewer = iframeDoc.querySelector('.pdfViewer'); // The div holding the rendered PDF pages
            const page = viewer ? viewer.querySelector('.page') : null; // Get the first page element

            if (page) {
                const pageWidth = page.offsetWidth; // Get the page's rendered width
                const pageHeight = page.offsetHeight; // Get the page's rendered height
                return { width: pageWidth, height: pageHeight };
            }
        }
        catch (err) {
            console.warn('Error accessing PDF page size:', err);
        }
        return { width: 0, height: 0 }; // Default if no page is found
    };

    // Function to resize the iframe and adjust the grid item height
    const resizeIframe = () => {
        const { width, height } = getPdfPageSize();
        if (width > 0 && height > 0) {
            // We have a loaded PDF so adjust the grid
            const currentHeight = parseInt($item.attr('gs-h'), 10);
            const loadedHeight = parseInt($item.attr('loaded-gs-h'), 10); // The height saved in database
            let newHeight = (loadedHeight < 50) ? 50 : loadedHeight; // Adjust in case saved height is too small
            // Update grid height, iframe, and .bt-pdf container height if needed
            if (currentHeight < newHeight) {
                grid.update(gridItemElement, { h: newHeight });
            }
            setTimeout(function() {
                // Adjust the height of the pdf after gridstack is finished
                // by finding out the card-body size by removing the card-header size and card-body padding from the grid content size
                let currentId = $item.attr('id');
                let blockWrapper = $item.find('.grid-stack-item-content');
                let blockHeader = $item.find('h2.card-header');
                let blockBody = $item.find('.card-body');
                $(pdfIframe).css('height', blockWrapper.height() - blockHeader.innerHeight() - parseInt(blockBody.css("padding-top")) - parseInt(blockBody.css("padding-bottom")));
            }, 600);
        }
        else if (pdfIframeOuter.hasClass('collapse') && !pdfIframeOuter.hasClass('show')) {
            // We have a PDF block but it is collapsed so we need to set it back to collapsed height
            grid.update(gridItemElement, { h: 11 });
            $(pdfIframe).css('height', '');
            $item.find('.bt-pdf').css('height', ''); // Adjust .bt-pdf container height as well
        }
        else {
            // We wait until the PDF has rendered
            setTimeout(resizeIframe, 100); // Retry if not ready
        }
    };

    // Trigger resize when iframe is ready
    if (pdfIframe.contentWindow.document.readyState === 'complete') {
        if (!$item.attr('loaded-gs-h')) {
            $item.attr('loaded-gs-h', $item.attr('gs-h'));
        }
        resizeIframe();
    }
    else {
        $item.attr('loaded-gs-h', $item.attr('gs-h'));
        pdfIframe.onload = resizeIframe;
    }

    if (dbsave) {
        // We want to update the loaded-gs-h height value
        const contentBlock = $item[0];
        if (contentBlock) {
            const gridOptions = grid.opts;
            height = Math.ceil(
                ((contentBlock.clientHeight + gridOptions.margin) / grid.getCellHeight()) + gridOptions.margin
            );
            // update the loaded height
            $item.attr('loaded-gs-h', height);
        }
    }

    return gridItemElement; // Return the updated grid item element
}

/**
 * Serialise/save to DB the grid after resizing a grid item element
 *
 * @param {Event} event
 * @param {GridItemHTMLElement} gridItemElement
 */
function onResizeBlock(event, gridItemElement) {
    const grid = document.querySelector('.grid-stack').gridstack;
    const itemWidth = $(gridItemElement).attr('gs-w');
    const itemHeight = $(gridItemElement).attr('gs-h') ?? GRIDSTACK_CONSTANTS.defaultHeight.toString();

    // Resize the PDF block if applicable
    const updatedGridItem = resizePdfBlockHeightIfNeeded(gridItemElement, grid, true);

    // Update the grid with the new height and other properties
    grid.update(updatedGridItem, { w: itemWidth, h: itemHeight, minH: GRIDSTACK_CONSTANTS.defaultHeight });

    $(window).trigger('blocksresized');
    saveAllBlocksDimensions(grid);
}

/**
 * Prevent propagation and default actions on grid changes
 */
function setUpPreventDefaultOnChangeGrid() {
    let grid = document.querySelector('.grid-stack').gridstack;

    // GridStackNode[]: gridNodes
    grid.on('change', function(event, gridNodes) {
        event.stopPropagation();
        event.preventDefault();
        saveAllBlocksDimensions(grid);
    });
}

/**
 * Stop listening to grid changes and colresize events
 *
 * Remove on('change') event for Gridstack
 * Remove on('colresize) events in the window
 */
function gridRemoveEvents() {
    $('.grid-stack').off('change');
    $(window).off('colresize');
}
