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

// self executing function for namespacing code
(function (ViewManager, $) {
    "use strict";

    //Private Properties
    ////////////////////
    var workspace = null;

    //Public Methods
    ////////////////
    ViewManager.addCSSRules = function () {
        var styleNode = $('<link>');
        styleNode.attr({
            'rel': 'stylesheet',
            'type': 'text/css',
            'href': config['wwwroot'] + 'theme/views-js.css'
        });
        $('head').prepend(styleNode);
    };

    ViewManager.replaceConfigureBlock = function (data) {
        var oldBlock = $('#blockinstance_' + data.blockid);
        data.data.javascript ??= '';
        if (oldBlock.length) {
            // Dispose the block videojs player if exists
            try {
                videojs('audio_' + data.blockid).dispose();
            }
            catch (err) {
            }
            try {
                videojs('video_' + data.blockid).dispose();
            }
            catch (err) {
            }
            // doing it this way stop inline js in the
            // data.data.html breaking things
            var temp = $('<div>').append(data.data.html);
            // Append any inline js to data.data.javascript
            temp.find('*').each(function () {
                if ($(this).prop('nodeName') === 'SCRIPT' && $(this).prop('src') === '') {
                    data.data.javascript += $(this).prop('innerHTML');
                }
            });
            var newBlock = temp.find('div.gridstackblock');
            // check if block has header link for quick edit
            var oldHeader = oldBlock.find('.block-header.quick-edit');
            if (oldHeader.length) {
                var replaceHeader = '';
                if (data.data.blockheader.length) {
                    replaceHeader = $(data.data.blockheader);
                    replaceHeader.removeClass('d-none');
                }
                else {
                    replaceHeader = oldHeader;
                }
                if (newBlock.find('.block-header.quick-edit').length > 0) {
                    // remove new one as it's events are not present
                    newBlock.find('.block-header.quick-edit').remove();
                }

                // add the wired up header to the new block
                newBlock.prepend(replaceHeader);
            }

            swapNodes(oldBlock.get()[0], newBlock.get()[0]); // using DOM objects, not jQuery objects so we needn't worry about IDs

            if (typeof (data.draftclass) != 'undefined' && data.draftclass && !$(newBlock).closest(".grid-stack-item-content").hasClass('draft')) {
                $(newBlock).closest(".grid-stack-item-content").addClass('draft');
            }
            else {
                $(newBlock).closest(".grid-stack-item-content").removeClass('draft');
            }

            if (data.data.newblocktype === 'pdf') {
                let grid = document.querySelector('.grid-stack').gridstack;
                let newgridblock = $(newBlock).closest(".grid-stack-item");
                newgridblock.attr('gs-h', DEFAULT_GRID_OPTIONS.cellHeight * 5); // Default PDF block to 5 rows
                onResizeBlock(null, newgridblock[0]);
            }
            var embedjs = data.data.javascript;
            if (typeof (embedjs) != 'undefined' && embedjs.indexOf("AC_Voki_Embed") !== -1) {
                var paramsstr = embedjs.substring(embedjs.lastIndexOf("(") + 1, embedjs.lastIndexOf(")"));
                var params = paramsstr.split(',');
                if (params.length == 7) { // old voki embed code has only 7 parameters
                    // change the last parameter to 1 so it returns the embed code instead of showing it
                    var newScript = 'AC_Voki_Embed(';
                    for (var i = 0; i < params.length - 1; i++) {
                        newScript += params[i] + ', ';
                    }
                    newScript += "1)";
                    var embedCode = get_string_ajax('reloadtoview', 'mahara');
                    if (window['AC_Voki_Embed']) {
                        embedCode = eval(newScript);
                    }
                    // add embed code to already loaded page
                    var newChild = document.createElement('div');
                    newChild.innerHTML = embedCode;
                    newBlock.get()[0].getElementsByClassName('mediaplayer')[0].appendChild(newChild);
                }
                else {
                    // patch for new voki code, need to reload page so it shows the embed code
                    $(window).trigger('embednewvoki');
                }
            }
            else {
                eval(data.data.javascript);
            }

            onRewriteConfigureButtons(newBlock.find('.configurebutton'));
            onRewriteDeleteButtons(newBlock.find('.deletebutton'));
            onRewriteCopyButtons(newBlock.find('.copybutton'));
        }
        if (data.closemodal) {
            hideDock();
            showMediaPlayers();
            setTimeout(function () {
                newBlock.find('.configurebutton').trigger("focus");
            }, 1);
        }
        else {
            return newBlock;
        }
        if (typeof (window.dragonDrop) != 'undefined') {
            var list = $('.grid-stack')[0];
            window.dragonDrop.initElements(list);
        }

        if (data.data.blockheader && data.data.blockheader.length) {
            activateModalLinks();
        }
    };

    /**
     * Pieform callback function for after a block config form is successfully
     * submitted
     */
    ViewManager.blockConfigSuccess = function (form, data) {
        if (data.formelementsuccess) {
            eval(data.formelementsuccess + '(form, data)');
        }
        data.closemodal = true;
        if (data.blockid) {
            ViewManager.replaceConfigureBlock(data);
        }
        if (data.otherblocks) {
            jQuery.each(data.otherblocks, function (ind, val) {
                ViewManager.replaceConfigureBlock(val);
            });
        }
    }

    /**
     * Pieform callback function for after a block config form fails validation
     */
    ViewManager.blockConfigError = function (form, data) {
        if (data.formelementerror) {
            eval(data.formelementerror + '(form, data)');
        }

        // TODO: reduce code duplication between here and getConfigureForm
        // and addConfigureBlock
        var blockInstanceId = jQuery(form).find('#instconf_blockconfig').val();
        var cancelbutton = jQuery('#cancel_instconf_action_configureblockinstance_id_' + blockInstanceId);
        if (jQuery(form).find('#instconf_new').val() == 1) {
            // Wire up the cancel button in the new form
            var deletebutton = jQuery('#configureblock .deletebutton');
            if (cancelbutton.length > 0) {
                cancelbutton.attr('name', deletebutton.attr('name'));
                cancelbutton.off();
                rewriteCancelButton(cancelbutton, blockInstanceId);
            }
        }
        else {
            cancelbutton.on('click', function (e) {
                var configbutton = jQuery('.view-container button[name="action_configureblockinstance_id_' + blockInstanceId + '"]');
                onModalCancel(e, configbutton);
            });
        }

        $(window).trigger('maharagetconfigureform');

        // Restart any TinyMCE fields if needed
        if (typeof tinyMCE !== 'undefined') {
            jQuery(form).find('textarea.wysiwyg').each(function () {
                tinyMCE.execCommand('mceAddEditor', false, $(this).prop('id'));
            });
        }
    }

    ViewManager.blockOptions = function () {
        $('#placeholderlist .card-option .card').each(function (idx, val) {
            $(val).off();
            $(val).on('click', function (ev, d) {
                ev.stopPropagation();
                ev.preventDefault();
                var blockid = $(ev.currentTarget).data('blockid');
                var option = $(ev.currentTarget).data('option');
                var title = encodeURIComponent($('#instconf_title').val());
                title = title.replace(/\./g, "%2E"); // Deal with . in the title
                title = title.replace(/\_/g, "%5F"); // Deal with _ in the title clashing with action string
                var isnew = $('#instconf_new').val() == '1' ? '1' : '0';
                var postData = {
                    'id': $('#viewid').val(),
                    'change': 1,
                    'blocktype': 'placeholder',
                };
                postData['action_changeblockinstance_id_' + blockid + '_new_' + isnew + '_blocktype_' + option + '_title_' + title] = true;
                sendjsonrequest(config['wwwroot'] + 'view/blocks.json.php', postData, 'POST', function (data) {
                    // Update block on page to be of new type
                    var newdata = {};
                    newdata.blockid = data.data.blockid;
                    newdata.viewid = data.data.viewid;
                    newdata.data = {};
                    newdata.data.html = data.data.display.html;
                    newdata.data.javascript = data.data.display.javascript;
                    newdata.data.newblocktype = data.data.newblocktype;
                    var blockInstance = ViewManager.replaceConfigureBlock(newdata);
                    if (data.data.configure) {
                        // The new block has configuration so update config modal to have new config form
                        if (data.data.isnew) {
                            addConfigureBlock(blockInstance, data.data.configure, true);
                        }
                        else {
                            // wire up the cancel button on chosen blocktype form to revert the block back to placeholder block
                            addConfigureBlock(blockInstance, data.data.configure);
                            var blockinstanceId = blockInstance.attr('data-id');
                            var cancelbutton = jQuery('#cancel_instconf_action_configureblockinstance_id_' + blockinstanceId);
                            cancelbutton.off('click');
                            cancelbutton.on('click', function (e) {
                                e.stopPropagation();
                                e.preventDefault();
                                var revpd = {
                                    'id': $('#viewid').val(),
                                    'change': 1,
                                    'blocktype': 'placeholder',
                                };
                                revpd['action_revertblockinstance_id_' + data.data.blockid + '_title_' + data.data.oldtitle] = true;
                                sendjsonrequest(config['wwwroot'] + 'view/blocks.json.php', revpd, 'POST', function (revdata) {
                                    console.log('success: ' + revdata.data.message);
                                    var revnewdata = {};
                                    revnewdata.blockid = revdata.data.blockid;
                                    revnewdata.viewid = revdata.data.viewid;
                                    revnewdata.data = {};
                                    revnewdata.data.html = revdata.data.display.html;
                                    revnewdata.data.javascript = revdata.data.display.javascript;
                                    var blockInstance = ViewManager.replaceConfigureBlock(revnewdata);
                                    var configbutton = jQuery('.view-container button[name="action_configureblockinstance_id_' + revdata.data.blockid + '"]');
                                    onModalCancel(e, configbutton);
                                },
                                function (revdata) {
                                    if (revdata.message) {
                                        console.log('error: ' + revdata.message);
                                    }
                                });
                            });
                        }
                    }
                    else {
                        // No configure form so we just need to close the modal
                        hideDock();
                    }
                },
                function (data) {
                    if (data.message && data.placement) {
                        $('#' + data.placement).find('.alert').remove();
                        $('#' + data.placement).prepend('<div class="alert alert-danger">' + data.message + '</div>');
                    }
                });
            });
        });
    }

    ViewManager.init = function () {

        // Page content div that contains the grid
        workspace = $('[data-role="workspace"]');

        // Rewrite the configure buttons to be ajax
        rewriteConfigureButtons();

        // Rewrite the delete buttons to be ajax
        rewriteDeleteButtons();

        // Rewrite the copy buttons to be ajax
        rewriteCopyButtons();

        // Setup the 'add block' dialog
        setupPositionBlockDialog();
        setUpDragNewBlockListener();
        setUpTidyUpGridButton();
        setUpClickOnDragButton();
        $(workspace).show();

        $(window).on('embednewvoki', function () {
            location.reload();
        });

        // Wait until images (if any) have been loaded so that heights can
        // be calculated correctly.
        jQuery(document).imagesLoaded().always(function() {
            $(window).trigger('colresize');
            $(window).trigger('blocksloaded');
        });

    } // init

    //Private Methods
    /////////////////

    /**
     * Add logic for when clicking on the '+' div
     *
     * This opens up the add new block modal
     */
    function setUpClickOnDragButton() {
        $('.newWidget').on('click keypress', function () {
            showAddNewBlockModal($(this));
        })
        $('.accessibleNewWidget').on('click', function (e) {
            e.preventDefault()
            e.stopPropagation()
            showAddNewBlockModal($(this));
        })
    }

    /**
     * Auto compacts the blocks on the grid
     */
    function setUpTidyUpGridButton() {
        $('.grid-compact').on('click', function (e) {
            e.preventDefault()
            e.stopPropagation()
            let grid = document.querySelector('.grid-stack').gridstack;
            grid.compact();
            saveAllBlocksDimensions(grid);
        })
    }

    /**
     * Logic for adding a new block from the quick edit sidebar
     *
     * This is for dragging the '+' into the grid
     */
    function setUpDragNewBlockListener() {
        let grid = document.querySelector('.grid-stack').gridstack;
        grid.on('dropped', function (event, previousNode, newNode) {
            if (newNode) {
                grid.removeWidget(newNode.el);
                addPlaceholderBlock({ 'positionx': newNode.x, 'positiony': newNode.y }, 'placeholder', config.defaultBlockWidth);
            }
        })
    }

    /**
     * Show the 'Add new block' modal when '+' is clicked on quick edit
     *
     * To pick on whether to add a new block to the top or bottom of the grid
     *
     * #addblock is the pop-up 'Add new block' modal for you to select
     * the position to place the new block
     *
     * @param {*} element
     */
    function showAddNewBlockModal(element) {
        let addBlockModal = jQuery('#addblock');
        addBlockModal.modal('show');
        addBlockModal.one('dialog.end', function (event, options) {
            if (options.saved) {
                addPlaceholderBlock(options.position, 'placeholder', config.defaultBlockWidth);
            }
            else {
                element.trigger("focus");
            }
        });

        addBlockModal.find('.modal-title').text(get_string('addnewblock', 'view', element.text()));
        addBlockModal.find('.block-inner').removeClass('d-none');

        addBlockModal.find('.deletebutton').trigger("focus");
        keytabbinginadialog(addBlockModal, addBlockModal.find('.deletebutton'), addBlockModal.find('.cancel'));
    }

    /**
     * Find the last block (vertically) on the page
     *
     * @param {int} numBlocks
     * @param {object} blocks
     * @returns HTMLElement
     */
    function findBottomBlock(numBlocks, blocks) {
        let lowestY = blocks[0].getAttribute('gs-y');
        let blockWithLowestY = blocks[0];

        for (let index = 1; index < numBlocks; index++) {
            let currentBlock = blocks[index];
            let currentBlockY = currentBlock.getAttribute('gs-y');
            if (currentBlock.getAttribute('gs-y') > lowestY) {
                blockWithLowestY = currentBlock;
                lowestY = currentBlock.getAttribute('gs-y');
            }
        }
        return blockWithLowestY;
    }
    /**
     * Add and display a placeholder block into the grid
     *
     * Add a block into the grid and display the html of
     * the block in the space where you've dropped the placeholder
     * @param {*} whereTo 'bottom', 'top', 'positionx', 'positiony'
     * @param {*} blocktype
     */
    function addPlaceholderBlock(whereTo, blocktype, customWidth = GRIDSTACK_CONSTANTS.desktopWidth) {
        let grid = document.querySelector('.grid-stack').gridstack;

        // Handle accessibility / one column view (mobile)
        let minWidth = grid.opts.minW;
        customWidth = customWidth < minWidth ? minWidth : customWidth;

        let postData = {
            'id': $('#viewid').val(),
            'change': 1,
            'blocktype': blocktype,
            'positionx': 0,
            'positiony': 0,
        };

        if (config.blockeditormaxwidth) {
            postData['cfheight'] = $(window).height() - 100;
        }

        if (whereTo == 'bottom') {
            if (grid.el.childElementCount > 0) {
                let blockHtmlElems = grid.el.children;
                let lastBLockHTMLEl = findBottomBlock(grid.el.childElementCount, blockHtmlElems)
                let lastBLockHTMLElPosY = lastBLockHTMLEl.getAttribute('gs-y');
                let lastBLockElHeight = lastBLockHTMLEl.getAttribute('gs-h');
                postData['positiony'] = lastBLockHTMLElPosY + lastBLockElHeight;
            }
            else {
                postData['positiony'] = 0;
            }
        }
        else {
            if (typeof (whereTo['positionx']) !== 'undefined') {
                postData['positionx'] = whereTo['positionx'];
            }
            if (typeof (whereTo['positiony']) !== 'undefined') {
                postData['positiony'] = whereTo['positiony'];
            }
        }

        let width = customWidth;
        if (grid._widthOrContainer() <= grid.opts.columnOpts.breakpoints[0].w) {
            GRIDSTACK_CONSTANTS['mobileWidth']; // Default gridstack block width for mobile
            postData['gridonecolumn'] = true;
        }

        postData['action_addblocktype_positionx_' + postData['positionx'] + '_positiony_' + postData['positiony'] + '_width_' + width + '_height_' + '3'] = true;
        sendjsonrequest(config['wwwroot'] + 'view/blocks.json.php', postData, 'POST', function (data) {

            // Put the block's html into place
            let div = $('<div>').html(data.data.display.html);
            let blockInstance = div.find('div.grid-stack-item');
            let blockId = blockInstance.attr('id').substring(6);
            let dimensions = {
                positionx: blockInstance[0].getAttribute('gs-x'),
                positiony: blockInstance[0].getAttribute('gs-y'),
            }
            addBlockCss(data.css);

            dimensions.width = customWidth;
            dimensions.height = GRIDSTACK_CONSTANTS.defaultHeight;

            // Add block into Gridstack grid
            addNewWidget(blockInstance[0], blockId, dimensions, grid, 'newblock-highlight', dimensions.height);

            if (data.data.configure) {
                showDock($('#configureblock'), true);
                addConfigureBlock(blockInstance, data.data.configure, true);
            }
            else {
                // if block has has_instance_config() set to false, eg 'comment' block
                rewriteDeleteButtons(blockInstance.find('.deletebutton'));
                blockInstance.find('.deletebutton').trigger("focus");
            }
            if (typeof (window.dragonDrop) != 'undefined') {
                var list = $('.grid-stack')[0];
                if (whereTo == 'top') {
                    // new block will show on top of the page but it's still as the last child in the DOM
                    // need to place it first of the list before dragon drop reset
                    var children = list.children;
                    var length = children.length;
                    list.insertBefore(children[length - 1], children[0]);
                }
            }
            else {
                if (typeof whereTo === 'string') {
                    $('html, body').animate({ scrollTop: $(blockInstance).offset().top }, 'slow');
                }
            }
            saveAllBlocksDimensions(grid);
        },
        function () {
            // On error callback we need to reset the Dock
            hideDock();
        });
    }

    function addBlockCss(csslist) {
        $(csslist).each(function (ind, css) {
            if ($('head link[href="' + $(css).attr('href') + '"]').length == 0) {
                $('head').prepend($(css));
            }
        });
    }

    /**
     * Find the buttons with the .configurebutton class and rewrites them
     */
    function rewriteConfigureButtons() {
        onRewriteConfigureButtons(workspace.find('.configurebutton'));
    }

    /**
     * Rewrites a set of 'configure' block buttons to be AJAX
     */
    function onRewriteConfigureButtons(buttons) {
        buttons.off('click touchstart');
        buttons.on('click touchstart', function (e) {
            e.stopPropagation();
            e.preventDefault();
            // Handle the only the closest button to the interaction
            getConfigureForm($(this).closest('.js-blockinstance'));
        });
    }

    /**
     * Find the buttons with the .deletebutton class and rewrites them
     */
    function rewriteDeleteButtons() {
        onRewriteDeleteButtons(workspace.find('.deletebutton'));
    }

    /**
     * Rewrites a set of 'delete' block buttons to be AJAX
     *
     * @param {Object} buttons: an object of buttons belonging to certain .deletebutton class
     * @param {String} [pblockinstanceId] If this is being called from the modal popup, we won't be able
     * to retrieve the button's block ID. So this optional parameter can directly supply the block ID.
     */
    function onRewriteDeleteButtons(buttons, pblockinstanceId) {
        if (buttons.hasClass('gallery')) {
            return;
        }
        buttons.off('click touchstart');
        buttons.on('click touchstart', function (e) {
            e.stopPropagation();
            e.preventDefault();

            var self = $(this),
                postData = { 'id': $('#viewid').val(), 'change': 1 },
                blockInstanceId;

            // If pblockinstanceId wasn't passed, retrieve the id from the button.
            if ((pblockinstanceId === undefined) && self.attr('data-id')) {
                blockInstanceId = self.attr('data-id');
            }
            else {
                // If pblockinstanceId was passed, then use that.
                blockInstanceId = pblockinstanceId;
            }

            self.prop('disabled', true);

            if (confirm(get_string('confirmdeleteblockinstance'))) {
                postData[self.attr('name')] = 1;

                sendjsonrequest(
                    config['wwwroot'] + 'view/blocks.json.php',
                    postData,
                    'POST',
                    function (data) {
                        if (
                            blockInstanceId !== undefined &&
                            blockInstanceId !== null
                        ) {
                            $('#blockinstance_' + blockInstanceId).remove();
                        }

                        var gridstackobj =
                            document.querySelector('.grid-stack').gridstack;
                        var blocktoremove = document.getElementById(
                            'block_' + blockInstanceId
                        );
                        gridstackobj.removeWidget(blocktoremove);

                        if (!$('#configureblock').hasClass('d-none')) {
                            hideDock();
                            showMediaPlayers();
                            self.trigger('focus');
                        }
                        // Reset column heights
                        $('.column-content').each(function () {
                            $(this).css('min-height', '');
                        });

                        self.prop('disabled', false);
                        if (typeof window.dragonDrop != 'undefined') {
                            var list = $('.grid-stack')[0];
                            window.dragonDrop.initElements(list);
                        }
                        saveAllBlocksDimensions(gridstackobj);
                    },
                    function () {
                        self.prop('disabled', false);
                    }
                );
            }
            else {
                self.prop('disabled', false);
            }
        });
    }

    /**
     * Find the buttons/link-like-buttons with the .copybutton class and rewrites them
     */
    function rewriteCopyButtons() {
        let copyButtons = workspace.find('.copybutton');
        onRewriteCopyButtons(copyButtons);
    }

    /**
     * Rewrites a set of 'copy' block buttons to be AJAX
     *
     * @param {Object} buttons: an object of buttons belonging to certain .copybutton class
     * @param {String} [blockInstanceId] If this is being called from the modal popup, we won't be able
     * to retrieve the button's block ID. So this optional parameter can directly supply the block ID.
     */
    function onRewriteCopyButtons(buttons, blockInstanceId) {
        buttons.off('click touchstart');
        buttons.on('click touchstart', function (e) {
            e.stopPropagation();
            e.preventDefault();

            let self = $(this);
            let postData = { 'id': $('#viewid').val(), 'change': 1 };

            // If blockInstanceId wasn't passed, retrieve the id from the button.
            if (blockInstanceId === undefined && self.attr('data-id')) {
                blockInstanceId = self.attr('data-id');
            }

            postData['action_copyblockinstance_id_' + blockInstanceId] = true;

            sendjsonrequest(
                config['wwwroot'] + 'view/blocks.json.php',
                postData,
                'POST',
                function (data) {
                    var grid = document.querySelector('.grid-stack').gridstack;
                    let block = data.data[0];
                    let oneColumnSize = grid.opts.minCellColumns;
                    let minHeight = '';
                    let draftClass = '';
                    let srElement = '';

                    var blockContent = block.content;
                    var blockHeight = block.height;

                    if (blockContent == null) {
                        blockContent = '';
                    }
                    else {
                        if (!$(blockContent).children().hasClass('collapse')) {
                            minHeight = blockHeight;
                        }
                    }
                    if (typeof block.draft != 'undefined' && block.draft) {
                        draftClass = 'draft';
                        srElement =
                            '<span class="visually-hidden">' +
                            get_string('draft') +
                            '</span>';
                    }
                    let blockHtmlElem =
                        '<div id="block_' +
                        block.id +
                        '" class="grid-stack-item" >' +
                        srElement +
                        '<div class="grid-stack-item-content ' +
                        draftClass +
                        '">' +
                        blockContent +
                        '</div></div>';

                    addNewWidget(blockHtmlElem, block.id, block, grid, block.class, minHeight);
                    rewriteConfigureButtons();
                    rewriteDeleteButtons();
                    rewriteCopyButtons();
                }
            );
        });
    }

    /**
     * Rewrites cancel button to remove a block
     *
     * @param {*} button
     * @param {*} blockinstanceId
     */
    function rewriteCancelButton(button, blockinstanceId) {
        button.on('click', function (event) {

            event.stopPropagation();
            event.preventDefault();

            var postData = { 'id': $('#viewid').val(), 'change': 1 };

            postData[button.attr('name')] = 1;

            sendjsonrequest(config['wwwroot'] + 'view/blocks.json.php', postData, 'POST', function (data) {

                var gridstackobj = document.querySelector('.grid-stack').gridstack;
                var blocktoremove = document.getElementById('block_' + blockinstanceId);
                gridstackobj.removeWidget(blocktoremove);

                if (!$('#configureblock').hasClass('d-none')) {
                    hideDock();
                    showMediaPlayers();
                    button.trigger("focus");
                }
            });

        });
    }

    /**
     * Return true if the mousedown is <LEFT BUTTON> or the keydown is <Space> or <Enter>
     */
    function isHit(e) {
        // Handle the event with either the MouseEvent.buttons or KeyboardEvent.code
        if (e.buttons !== undefined) {
            return e.button === 0 || e.buttons === 1; // Left mouse button pressed
        }
        if (e.code !== undefined) {
            return e.code === maharaUI.code.SPACE || e.code === maharaUI.code.ENTER;
        }
        return false;
    }

    /*
     * Initialises the dialog used to add and move blocks
     */
    function setupPositionBlockDialog() {

        $('#newblock .cancel, #addblock .deletebutton').on('mousedown keydown', function (e) {
            if (isHit(e) || e.code === maharaUI.code.ESCAPE) {
                closePositionBlockDialog(e, { 'saved': false });
            }
        });

        $('#newblock .submit').on('click keydown', function (e) {
            if (isHit(e)) {
                const position = $('#newblock_position').prop('selectedIndex');

                closePositionBlockDialog(e, {
                    'saved': true,
                    'position': (position == 0 ? 'top' : 'bottom'),
                });
            }
        });
    }

    /*
     * Closes the add/move block dialog
     */
    function closePositionBlockDialog(e, options) {
        e.stopPropagation();
        e.preventDefault();

        let addBlockModal = jQuery('#addblock');

        options.trigger = e.type;
        addBlockModal.modal('hide').trigger('dialog.end', options);
    }

    /*
     * Trigger an empty dock
     */
    function showDock(newblock, replaceContent) {
        dock.show(newblock, replaceContent, false);
    }

    function getConfigureForm(blockInstance) {
        let button = blockInstance.find('.configurebutton');
        let blockInstanceId = blockInstance.attr('data-id');
        let content = blockInstance.find('.js-blockinstance-content');

        let oldContent = content.html();
        let loading = $('<span>').attr('class', 'icon icon-spinner animate-spin icon-pulse block-loading');
        let postData = { 'id': $('#viewid').val(), 'change': 1 };


        showDock($('#configureblock'), true);

        // delay processing so animation can complete smoothly
        // this may not be necessary once json requests are done with jquery
        setTimeout(function () {

            postData[button.attr('name')] = 1;

            sendjsonrequest('blocks.json.php', postData, 'POST', function (data) {

                addConfigureBlock(blockInstance, data.data);


                $('#action-dummy').attr('name', button.attr('name'));

                var cancelButton = $('#cancel_instconf_action_configureblockinstance_id_' + blockInstanceId),
                    heightTarget = $('#configureblock').find('[data-height]');

                if (heightTarget.length > 0) {
                    limitHeight(heightTarget);
                }

                cancelButton.on('click', function (e) {
                    onModalCancel(e, button);
                });
            });

        }, 500);
    }

    /**
     * Logic for when a modal is cancelled
     *
     * @param {*} e
     * @param {*} button
     */
    function onModalCancel(e, button) {
        e.stopPropagation();
        e.preventDefault();

        hideDock();
        showMediaPlayers();
        button.trigger("focus");
    }

    function limitHeight(target) {

        $(window).on('resize', function () {

            target.height('auto'); //reset so measurements will be accurate

            var targetHeight = $(target).find(target.attr('data-height')).height(),
                windowHeight = $(window).height() - 50,
                height = windowHeight < targetHeight ? windowHeight : targetHeight;


            target.height(height);
        });
    }

    /**
     * This function is called before the modal is opened. In theory it could be used to make changes
     * to the display of elements before the modal opens (for things that might interfere with the
     * modal.
     *
     * It's currently empty because everything works fine without it.
     */
    function hideMediaPlayers() {
    }

    /**
     * This function is called after the modal is closed. If you have deactivated things using
     * hideMediaPlayers, this can be a good place to re-open them.
     *
     * It is also used as a hacky place to hold other things that should be triggered after the
     * modal closes.
     */
    function showMediaPlayers() {
        if (tinyMCE && tinyMCE.activeEditor && tinyMCE.activeEditor.id) {
            tinyMCE.execCommand('mceRemoveEditor', false, tinyMCE.activeEditor.id);
        }
        if (config.mathjax && MathJax !== undefined) {
            MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
        }
    }

    function addConfigureBlock(oldblock, configblock, removeoncancel) {

        hideMediaPlayers();

        var temp = $('<div>').html(configblock.html),
            newblock = $('#configureblock'),
            title = temp.find('.blockinstance .blockinstance-header').html(),
            content = temp.find('.blockinstance .blockinstance-content').html(),
            blockInstanceId = temp.find('.blockinstance').attr('data-id'),
            deletebutton,
            cancelbutton;

        newblock.find('.blockinstance-header').html(title);
        newblock.find('.blockinstance-content').html(content);

        deletebutton = newblock.find('.deletebutton');
        deletebutton.off().attr('name', 'action_removeblockinstance_id_' + blockInstanceId);

        // Lock focus to the newly opened dialog
        deletebutton.trigger("focus");

        if (removeoncancel !== undefined) {
            onRewriteDeleteButtons(deletebutton, blockInstanceId);

            cancelbutton = $('#cancel_instconf_action_configureblockinstance_id_' + blockInstanceId);

            if (cancelbutton.length > 0) {
                cancelbutton.attr('name', deletebutton.attr('name'));
                cancelbutton.off();
                rewriteCancelButton(cancelbutton, blockInstanceId);
            }
        }
        else {
            deletebutton.on('click', function (e) {
                if ((formchangemanager.checkDirtyChanges() && confirm(get_string('confirmcloseblockinstance'))) || !formchangemanager.checkDirtyChanges()) {
                    e.stopPropagation();
                    e.preventDefault();

                    hideDock();
                    showMediaPlayers();

                    setTimeout(function () {
                        oldblock.find('.configurebutton').trigger("focus");
                    }, 1);
                }
            });
        }

        $(window).trigger('maharagetconfigureform');

        // still needed for tinymce :-/
        // @todo - find a way to remove the eval
        (function () {
            eval(configblock.javascript);
        })();

        keytabbinginadialog(newblock, newblock.find('.deletebutton'), newblock.find('.cancel'));

    } // end of addConfigureBlock()

    /**
     * Reset the form change check on hiding the dock
     */
    function hideDock() {
        // Reset the form change checker
        var form = formchangemanager.find('instconf');
        if (form !== null) {
            form.unbind();
            form.reset();
        }

        dock.hide();
    }

    function swapNodes(a, b) {
        var aparent = a.parentNode;
        var asibling = a.nextSibling === b ? a : a.nextSibling;
        b.parentNode.insertBefore(a, b);
        aparent.insertBefore(b, asibling);
    }

    /**
     * Find the co-ordinates of a given block instance
     *
     * This returns a {row: x, column: y, order: z} hash
     */
    function getBlockinstanceCoordinates(blockInstance) {
        // Work out where to send the block to
        var columnContainer = $('.block-placeholder').closest('div.column'),
            row = parseInt(columnContainer.attr('id').match(/row_(\d+)_column_(\d+)/)[1], 10),
            column = parseInt(columnContainer.attr('id').match(/row_(\d+)_column_(\d+)/)[2], 10),
            columnContent = columnContainer.find('div.column-content'),
            order = 0;

        columnContent.children().each(function () {
            if ($(this).attr('id') == blockInstance.attr('id')) {
                order++;
                return false;
            }
            else if ($(this).hasClass('blockinstance')) {
                order++;
            }
        });
        return { 'row': row, 'column': column, 'order': order };
    }
}(window.ViewManager = window.ViewManager || {}, jQuery));

ViewManager.addCSSRules();

/**
 * Pieform callback method. Just a wrapper around the ViewManager function,
 * because Pieforms doesn't like periods in callback method names.
 * @param form
 * @param data
 */
function blockConfigSuccess(form, data) {
    return ViewManager.blockConfigSuccess(form, data);
}

function setupEditMode() {
    const grid = document.querySelector('.grid-stack').gridstack;
    const isOneColumn = grid._widthOrContainer() <= grid.opts.columnOpts.breakpoints[0].w;

    if (isOneColumn) {
        alert(get_string('blocks_edit_one_column_node'));
    }

    return ViewManager.init();
}



/**
 * Pieform callback method. Just a wrapper around the ViewManager function,
 * because Pieforms doesn't like periods in callback method names.
 * @param form
 * @param data
 */
function blockConfigError(form, data) {
    return ViewManager.blockConfigError(form, data);
}

function wire_blockoptions() {
    return ViewManager.blockOptions();
}

//////////////////////// Helpers for block content recovering backups /////////////////

/**
 * Helper for showing "preview" boxes, which are just modal windows
 * Javascript for the views interface
 *
 * @package    mahara
 * @subpackage core
 * @author     Catalyst IT Limited <mahara@catalyst.net.nz>
 * @license    https://www.gnu.org/licenses/gpl-3.0.html GNU GPL version 3 or later
 * @copyright  For copyright information on Mahara, please see the README file distributed with this software.
 *
 */

let backupData = null;
let restoreConfirmString = '';

function setupBlockPreview(id) {
    let recoveryButton = $('#instconf_block_recovery');

    // Set the index to -1 so that the 'Enter' key doesn't default to this button
    recoveryButton.tabIndex = '-1';

    recoveryButton.on('click', function (e) {
        e.preventDefault();
        const params = { 'id': id }
        sendjsonrequest(
            config.wwwroot + 'view/blockcontent.json.php',
            params,
            'POST',
            (data) => {
                let boundedShowPreview = showBlockPreview.bind(null, data);
                let res = boundedShowPreview();
            }
        );
    });
}

function showBlockPreview(data) {
    jQuery("#page-modal .modal-dialog").addClass("modal-lg");
    jQuery("#page-modal .modal-body").html(data.html);
    jQuery("#page-modal").modal("show");
    backupData = data.backup_instance_arr;
    restoreConfirmString = data.restore_backup_string;
}

jQuery(function ($) {
    "use strict";
    if ($(".js-page-modal") === undefined) {
        return;
    }

    $(".js-page-modal .modal-body").on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
});

/**
 * Pop up an alert to confirm
 */
function confirmBlockBackupRecovery() {
    const formname = 'instconf';
    if (confirm(restoreConfirmString)) {
        for (const [key, value] of Object.entries(backupData)) {
            modifyTinyMCEContentBlockRecovery(formname, key, value)
        }
    }
}

/**
 * Overwrite the content of the TinyMCE associated to the
 * form name and field
 *
 * @param {*} formname
 * @param {*} field
 * @param {*} content
 */
function modifyTinyMCEContentBlockRecovery(formname, field, content) {
    let formField = tinyMCE.get(formname + "_" + field);
    if (formField) {
        formField.setContent(content);
    }
    // Clear the textarea (in case TinyMCE is disabled)
    jQuery("#" + formname + "_" + field).val(content);
}

