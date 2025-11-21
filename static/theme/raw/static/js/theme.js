/* eslint-disable no-undef */
/*eslint brace-style: ["error", "stroustrup"]*/
/*jslint browser: true, nomen: true,  white: true */

jQuery(function ($) {
    "use strict";

    /*
     * Make sure an affix is always the width of its container element
     */
    function affixSize() {
        var affix = $('[data-spy="affix"]'),
            affixwidth,
            affixheight,
            i;

        for (i = 0; i < affix.length; i = i + 1) {
            affixwidth = $(affix[i]).parent().width();
            affixheight = $(affix[i]).height() + 100;

            $(affix[i]).width(affixwidth);

            // prevents short pages from bouncing the user back to the top
            $(affix[i]).parent().height(affixheight);
        }

        $(window).on("resize colresize", function () {
            var i;

            for (i = 0; i < affix.length; i = i + 1) {
                affixwidth = $(affix[i]).parent().width();
                affixheight = $(affix[i]).height() + 100;

                $(affix[i]).width(affixwidth);

                // prevents short pages from bouncing the user back to the top
                $(affix[i]).parent().height(affixheight);
            }
        });
    }

    /*
     * We need to know the number of site message in ordder to adjust positioning
     */
    function siteMessages() {
        var message;

        // Remove extra padding when there are no site message
        if ($(".site-messages").length === 0) {
            $(".header").addClass("no-site-messages");
            $(".main-nav").addClass("no-site-messages");
        }
        else if ($(".site-messages") !== undefined) {
            message = $(".site-messages").find(".site-message");
            $(".header").addClass("message-count-" + message.length);
            $(".header").removeClass("no-site-messages");
        }
    }

    /**
     * Focus the first form element when forms are expanded
     */
    function focusOnOpen() {
        $('[data-action~="focus-on-open"]').on(
            "shown.bs.collapse",
            function () {
                $(this).find("form input").first().trigger("focus");
            }
        );
    }

    /*
     * Clear form when a form is collapsed
     */
    function resetOnCollapse() {
        $('[data-action~="reset-on-collapse"]').on(
            "d-none.bs.collapse",
            function () {
                var i,
                    forms = $(this).find("form");
                for (i = 0; i < forms.length; i = i + 1) {
                    forms[i].reset();
                }
            }
        );
    }

    function attachTooltip() {
        $('[data-bs-toggle="tooltip"]').tooltip({
            container: "body",
            placement: "right",
            viewport: "body",
        });
    }

    /*
     * Calculate carousel(image gallery) height
     */
    window.carouselHeight = function () {
        var carousel = $(".carousel"),
            i,
            j,
            carouselItem,
            height;

        carousel.removeClass("carousel-ready");

        for (i = 0; i < carousel.length; i = i + 1) {
            $(carousel[i]).find(".item").addClass("inline");

            height = 0;
            carouselItem = $(carousel[i]).find(".item");

            for (j = 0; j < carouselItem.length; j = j + 1) {
                if ($(carouselItem[j]).height() > height) {
                    height = $(carouselItem[j]).height();
                }
            }

            $(carousel[i]).find(".item").removeClass("inline");

            $(carousel[i]).height(height);
            $(carousel[i]).addClass("carousel-ready");
        }
    };

    /*
     * Initialise masonry for thumbnail gallery
     */
    function initThumbnailMasonry() {
        $(".js-masonry.thumbnails").masonry({
            itemSelector: ".thumb",
        });
    }

    function initUserThumbnailMasonry() {
        $(".js-masonry.user-thumbnails").masonry({
            itemSelector: ".user-icon",
        });
    }

    function handleInputDropdown(context) {
        var val = context.find("select").find("option:selected").text();
        if (val.length > 40) {
            val = val.substring(0, 40) + "...";
        }

        context.find(".js-with-dropdown input").attr("placeholder", val);
        if (context.find(".js-dropdown-context").length > 0) {
            context.find(".js-dropdown-context").html("(" + val + ")");
        }
        else {
            context
                .find(".js-with-dropdown label")
                .append(
                    '<em class="js-dropdown-context text-midtone text-small">(' +
                        val +
                        ")</em>"
                );
        }
    }

    function attachInputDropdown() {
        // Sets a new context for every .js-dropdown-group item
        $(".js-dropdown-group").each(function () {
            var context = $(this);
            handleInputDropdown(context);
        });

        $(".js-dropdown-group select").on("change", function () {
            var context = $(this).closest(".js-dropdown-group");
            handleInputDropdown(context);
        });
    }

    function setupCustomDropdown() {
        /*
         * Custom dropdown creates a fake select box that can have items of an
         * arbitrary length (unlike attachInputDropdown which uses a select).
         * For screenreaders, it works like a UL of links.
         */

        /* Utilize bootstrap functions for showing/ hiding the list when
         *  user presses the 'Enter' key
         */
        $(".custom-dropdown > .picker").keydown(function (e) {
            if (e.code === maharaUI.code.ENTER) {
                $(this).parent().children("ul").collapse("toggle");
            }
        });
    }

    function calculateObjectVideoAspectRatio() {
        var allVideos = $(".mediaplayer object > object"),
            i;
        for (i = 0; i < allVideos.length; i = i + 1) {
            $(allVideos[i]).attr(
                "data-aspectRatio",
                allVideos[i].height / allVideos[i].width
            );
        }
    }

    function responsiveObjectVideo() {
        var allVideos = $(".mediaplayer object > object"),
            i,
            fluidEl,
            newWidth;
        for (i = 0; i < allVideos.length; i = i + 1) {
            (fluidEl = $(allVideos[i]).parents(".mediaplayer-container")),
            (newWidth = $(fluidEl).width());
            $(allVideos[i]).removeAttr("height").removeAttr("width");
            $(allVideos[i])
                .width(newWidth)
                .height(newWidth * $(allVideos[i]).attr("data-aspectRatio"));
        }
    }

    $(window).on("resize colresize", function () {
        carouselHeight();
        initThumbnailMasonry();
        initUserThumbnailMasonry();
        responsiveObjectVideo();
    });

    $(window).on("versioningload", function () {
        carouselHeight();
        initThumbnailMasonry();
        initUserThumbnailMasonry();
        responsiveObjectVideo();
    });

    if (document.readyState === "complete") {
        carouselHeight();
        initUserThumbnailMasonry();
    }

    $(".block.collapse").on("shown.bs.collapse", function () {
        carouselHeight();
    });

    $(".navbar-main .navbar-collapse.collapse").on(
        "show.bs.collapse",
        function (event) {
            event.stopPropagation();
            $(".navbar-collapse.collapse.show").collapse("hide");
        }
    );

    $(".navbar-main .child-nav.collapse").on(
        "show.bs.collapse",
        function (event) {
            event.stopPropagation();
            $(".child-nav.collapse.show").collapse("hide");
        }
    );

    affixSize();
    siteMessages();
    focusOnOpen();
    resetOnCollapse();
    attachTooltip();
    calculateObjectVideoAspectRatio();
    responsiveObjectVideo();

    if ($(".js-dropdown-group").length > 0) {
        attachInputDropdown();
    }

    if ($(".custom-dropdown").length > 0) {
        setupCustomDropdown();
    }

    $(".js-select2 select").each(function () {
        if ($(this).data("select2-id")) {
            // Already been initialized
        }
        else {
            $(".js-select2 select").select2({});
        }
    });

    /*
     * Close navigation when ESC is pressed or focus is moved from navigation menu
     */
    $(document).on("click keyup", function (event) {
        // keyESCAPE constant is used since jQuerty.ui is not loaded on all pages
        // var keyESCAPE = 27; // not used at all
        if (
            (event.type == "click" &&
                !(
                    $(event.target).closest(".navbar-toggle, .navbar-form")
                        .length || event.which == 3
                )) ||
            (event.type == "keyup" && event.code === maharaUI.code.ESCAPE)
        ) {
            $(".navbar-collapse.collapse.show").collapse("hide");
        }
    });
});

// Inspo from https://github.com/twbs/bootstrap/blob/main/site/static/docs/5.3/assets/js/color-modes.js
let maharaTheme = document.querySelector("html").getAttribute("data-theme");

const getThemeAllowsDarkMode = () => {
    maharaTheme = document.querySelector("html").getAttribute("data-theme");

    let result = false;
    ENABLED_THEMES_WITH_DARK_MODE.forEach((theme) => {
        if (theme["basename"] === maharaTheme) {
            result = true;
        }
        return;
    });
    return result;
};

const getPreferredBSTheme = () => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
};

const setTheme = (bsTheme) => {
    if (bsTheme != "light" && getThemeAllowsDarkMode() == false) {
        bsTheme = "light";
    }
    if (bsTheme === "auto") {
        document.documentElement.setAttribute(
            "data-bs-theme",
            window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"
        );
    }
    else {
        document.documentElement.setAttribute("data-bs-theme", bsTheme);
    }
    createThemeCookie("prefers-color-scheme", bsTheme);
    // switch logos when browser switches between dark and light mode
    updateLogo(bsTheme);
};

setTheme(getPreferredBSTheme());

window.addEventListener("DOMContentLoaded", () => {
    let preferredBSTheme = getPreferredBSTheme();
    setTheme(preferredBSTheme);
    updateLogo(preferredBSTheme);
});

window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
        let preferredBSTheme = getPreferredBSTheme();
        setTheme(preferredBSTheme);
    });

/*
 * Update the site logo
 *
 * Ignore the colour scheme if the logo is custom
 *
 * Note: This function is only for updating the theme if the page is already loaded
 *       otherwise we rely on the Theme class's get_image_url on page refresh
 */
function updateLogo(bsTheme) {
    let headerLogoNodes = document.querySelectorAll(".header .logo > img");
    if (headerLogoNodes.length > 0) {
        // This won't work because when the DOM is not loaded, it will come up as nothing
        let headerLogo = headerLogoNodes[0].dataset;
        if (headerLogo.customlogo) {
            headerLogo.src = headerLogo.customlogo;
            return;
        }

        const rawLightThemeLogo = config.wwwroot + "theme/raw/images/site-logo.svg";
        const rawDarkThemeLogo = config.wwwroot + "theme/raw/images/site-logo-dark.svg";

        if (maharaTheme === 'default') {
            maharaTheme = 'raw';
        }

        const lightThemeLogo = config.wwwroot + "theme/" + maharaTheme + "/images/site-logo.svg";
        const darkThemeLogo = config.wwwroot + "theme/" + maharaTheme + "/images/site-logo-dark.svg";

        if (!bsTheme) {
            bsTheme =
                getThemeAllowsDarkMode() &&
                window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light";
        }

        if (getThemeAllowsDarkMode()) {
            if (bsTheme == "dark") {
                checkFileAccessible(darkThemeLogo).then((success) => {
                    if (success) {
                        headerLogo.src = darkThemeLogo;
                    }
                    else {
                        headerLogo.src=rawDarkThemeLogo;
                    }
                });
            }
            else {
                checkFileAccessible(lightThemeLogo).then((success) => {
                    if (success) {
                        headerLogo.src=lightThemeLogo;
                    }
                    else {
                        headerLogo.src=rawLightThemeLogo;
                    }
                });
            }
        }
    }
}

/**
 * Function to create the cookie for holding the theme preference
 *
 * @param {*} name
 * @param {*} value
 */
function createThemeCookie(name, value) {
    document.cookie = escape(name) + "=" + escape(value) + "; path=/";
}

// Need more testing on other themes
async function checkFileAccessible(fileURL) {
    try {
        const response = await fetch(fileURL, {method: 'HEAD'});
        if (response.status === 200) {
            return true;
        }
        else {
            return false;
        }
    }
    catch {
        return false;
    }
}

