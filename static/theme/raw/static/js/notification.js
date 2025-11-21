/*jslint browser: true, nomen: true,  white: true */
/* global jQuery, $ */
jQuery(function($) {
    "use strict";

    var paginatorData = window.paginatorData;
    var requesturl = 'indexin.json.php';

    /**
     * Set up event handlers
     */
    function init() {
        // Re-attach listeners when page has finished updating
        $(window).on('pageupdated',function() {
            // Need to reset this if lazy loading a block
            if ($('[data-requesturl]').length > 0) {
                requesturl = $('[data-requesturl]').attr('data-requesturl');
            }
            attachNotificationEventListeners();
        });

        attachNotificationEventListeners();

        if ($('[data-requesturl]').length > 0) {
            requesturl = $('[data-requesturl]').attr('data-requesturl');
        }

        $('.notification .control-wrapper').on('click', function(e) {
            e.stopPropagation();
        });

        // Check all of type
        $('[data-togglecheckbox]').on('change', function(){
            var targetClass = '.' + $(this).attr('data-togglecheckbox');
            $(targetClass).prop('checked', $(this).prop('checked'));
            $(targetClass).trigger('change');
        });

        $('[data-triggersubmit]').on('click', function(){
            var targetID = '#'  + $(this).attr('data-triggersubmit');
            $(targetID).trigger('click');
        });

        $('[data-action="markasread"]').on('click', function(e){
            e.preventDefault;
            markNotificationsRead(e, this, paginatorData);
        });

        $('[data-action="deleteselected"]').on('click', function(e){
            e.preventDefault;
            deleteSelectedNotifications(e, this, paginatorData);
        });

        $('[data-action="escalateSelected"]').on('click', function(e){
            e.preventDefault;
            displayEscalateIssueReportModal(e, this, paginatorData);
        });

        $('.js-notifications-type').on('change', function(e){
            changeActivityType(e);
        });

    }

    /**
     * Mark checked notifications as read
     *
     * @param {*} e
     * @param {*} self
     * @param {*} paginatorData
     * @return {*}
     */
    function markNotificationsRead(e, self, paginatorData) {
        var selectedNotifications = $(self).closest('.notification-parent').find('.js-notifications .control.unread input:checked');
        var i;
        var requestdata = {};
        var data = {};

        if(selectedNotifications < 1){
            //@todo maybe tell the user they need something valid checked
            return; //no valid items selected
        }

        for (i = 0; i < selectedNotifications.length; i++) {
            data[selectedNotifications[i].name] = 1;
        }

        requestdata['data'] = data;
        requestdata['markasread'] = 1;

        if (paginatorData) {
            for (var page in paginatorData.params) {
                if(paginatorData.params.hasOwnProperty(page)){
                    requestdata[page] = paginatorData.params[page];
                }
            }
        }

        sendjsonrequest(requesturl, requestdata, 'POST', function (data) {
            markSingleNotificationRead(data, false);
        });
    }

    /**
     *  Delete the checked notifications
     *
     * @param {*} e
     * @param {*} self
     * @param {*} paginatorData
     * @return {*}
     */
    function deleteSelectedNotifications(e, self, paginatorData) {
        // Checked messages
        var selectedNotifications = $(self).closest('.notification-parent').find('.js-notifications .control input:checked');
        var i;
        var requestdata = {};
        var data = {};

        if (selectedNotifications.length < 1) {
            //@todo tell the user they need something valid checked
            return; //no valid items selected
        }

        for (i = 0; i < selectedNotifications.length; i++) {
            data[selectedNotifications[i].name] = 1;
        }

        requestdata['data'] = data;
        requestdata['delete'] = 1;
        requestdata['markasread'] = 1;

        if (paginatorData) {
            for (var page in paginatorData.params) {
                if(paginatorData.params.hasOwnProperty(page)){
                    requestdata[page] = paginatorData.params[page];
                }
            }
        }

        sendjsonrequest(requesturl, requestdata, 'POST', function (data) {
            markSingleNotificationRead(data, false);
            window.paginator.updateResults(data);
        });
    }

    /**
     * Display modal and form
     *
     * @param {*} e
     * @param {*} self
     * @param {*} paginatorData
     * @returns
     */
    function displayEscalateIssueReportModal(e, self, paginatorData) {
        var selectedNotifications = $(self).closest('.notification-parent').find('.js-notifications .control input:checked');
        var validIssueReportsToEscalateInputs = [];

        for (var i = 0; i < selectedNotifications.length; i++) {
            var relativeLink = selectedNotifications[i].parentNode.parentNode.parentNode.childNodes[3]
            var issueReportEscalationStatus = relativeLink.getAttribute('data-escalated');
            if (issueReportEscalationStatus == 0) {
                validIssueReportsToEscalateInputs.push(selectedNotifications[i]);
            }
        }

        if(validIssueReportsToEscalateInputs.length < 1){
            var noValidIssueEscalation = $('#escalate_report_form_no_valid_issue_reports').attr('value');
            alert(noValidIssueEscalation);
            return;
        }

        var escalateReportForm = new bootstrap.Modal(document.getElementById('escalate-report-modal'));
        escalateReportForm.show();
        populateEscalateForm();
    }

    /**
     * Find the non-escalated check notifications and regenerate the HTML
     *
     * The AJAX call will check against the DB on the updated issue report data to display
     * (escalated) according to the DB and replace the HTML.
     *
     * We will utilise the markasread existing logic here as escalating will
     * assume that the contents have been read and to use existing logic for refreshing html
     *
     * @return {*}
     */
    function markNotificationsEscalated() {
        var selectedNotifications = $('.js-notifications .control.nonescalated input:checked');
        var i;
        var requestdata = {};
        var data = {};

        if(selectedNotifications.length < 1){
            return; //no valid items selected
        }

        for (i = 0; i < selectedNotifications.length; i++) {
            data[selectedNotifications[i].name] = 1;
        }

        // Sending a json request to mark it as read will not only mark it read but
        // also regenerate the HTML so it will say (escalated) based on the DB
        requestdata['data'] = data;
        requestdata['markasread'] = 1;
        requestdata['custom_post_action_msg_tag'] = 'marked_as_escalated';
        requestdata['custom_post_action_msg_section'] = 'activity';


        if (paginatorData) {
            for (var page in paginatorData.params) {
                if(paginatorData.params.hasOwnProperty(page)){
                    requestdata[page] = paginatorData.params[page];
                }
            }
        }

        sendjsonrequest(requesturl, requestdata, 'POST', function (data) {
            paginator.updateResults(data);
        });

    }

    /**
     * Mark checked notifications as read
     *
     * @param {*} e
     * @param {*} self
     * @param {*} paginatorData
     * @return {*}
     */
    function markCheckedNotificationsRead(e, self, paginatorData) {
        var checked = $(self).find('.control.unread input.tocheck');
        var inboxblockunread = $(self).find('.link-block.unread');
        var item = self;
        var i;
        var requestdata = {};

        if (checked.length < 1 && inboxblockunread.length < 1) {
            return; // no valid items selected
        }

        for (i = 0; i < checked.length; i++) {
            requestdata[checked[i].name] = 1;
        }

        requestdata['list'] = $(self).find('a[data-list]').attr('data-list');
        requestdata['readone'] = $(self).find('a[data-id]').attr('data-id');

        if (paginatorData) {
            for (var page in paginatorData.params) {
                if(paginatorData.params.hasOwnProperty(page)){
                    requestdata[page] = paginatorData.params[page];
                }
            }
        }

        sendjsonrequest(requesturl, requestdata, 'GET', function (data) {
            markSingleNotificationRead(data, item);
        });
    }

    /**
     * Mark given notification as read
     *
     * @param {*} data
     * @param {*} self
     * @returns when inbox is less than 1
     */
    function markSingleNotificationRead(data, self) {
        var inboxmenu = $('#nav-inbox'),
            countnode,
            countnodesr,
            notificationList = $('.notification-list');

        if (inboxmenu.length < 1) {
            return;
        }
        if (data.data.newunreadcount !== undefined) {
            countnode = inboxmenu.find('.unreadmessagecount');
            if (countnode.length > 0) {
                countnode.html(data.data.newunreadcount);
            }
            countnodesr = inboxmenu.find('.unreadmessagecount-sr');
            if (countnodesr.length > 0) {
                countnodesr.html(data.data.newunreadcounttext);
            }
        }
        if (data.data.html) {
            notificationList.html(data.data.html);
        }
        else if (self) {
            $(self).removeClass('text-weight-bold js-card-unread');
            $(self).find('.unread').removeClass('unread'); // for inbox block
        }
        $('#selectall').attr('checked', false); // Need to uncheck bulk checkbox
    }

    /**
     * Change activity type
     *
     * Does something related to deleting notifications
     *
     * @param {*} e
     */
    function changeActivityType(e) {
        var deleteAllNotificationsForm = document.forms['delete_all_notifications'];
        var params;
        var query = $(e.currentTarget).val();

        deleteAllNotificationsForm.elements['type'].value = query;
        params = {'type': query};

        sendjsonrequest(requesturl, params, 'GET', function(data) {
            window.paginator.updateResults(data);
            attachNotificationEventListeners();
        });
    }

    /**
     * Attach notification events
     *
     * - Adding classes to checked notifications
     * - Marking unread notifications as read on 'show.bs.collapse'
     */
    function attachNotificationEventListeners() {

        // Add warning class to all selected notifications
        $('.card .control input').on('change', function() {
            if ($(this).prop('checked')) {
                $(this).closest('.card').addClass('card-warning');
            }
            else {
                $(this).closest('.card').removeClass('card-warning');
            }
        });

        $('.js-card-unread').on('show.bs.collapse', function(e) {
            markCheckedNotificationsRead(e, this, paginatorData);
        });

        $(window).on('reports_escalated', function (event, notificationIds) {
            markNotificationsEscalated(event, notificationIds)
        });

        $('#escalate_report_form_submit').on('click', function (event) {
            document.getElementById("escalate_report_form").addEventListener("submit", (listenerEvent) => {
                var yesOrNoChecked = $('#escalate_report_form_check_for_sensitive_info').val();
            });


        });
    }

    // Initialising the notification.js

    init();
});