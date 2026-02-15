let pointerNumber = 0;
let $mo = jQuery;

$mo(window).on("load", function () {
    if (!moTour.tourTaken) {
        startTour(pointerNumber);
    }

    $mo("#restart_tour_button").click(function () {
        resetTour();
        startTour(pointerNumber);
    });
});

/**
 * This function calls the functions that add overlay and create the cards.
 * @param pointerNumber int value
 */
function startTour(pointerNumber) {
    if (!moTour.tourData) return;

    if (Object.keys(moTour.currentPage).length > 1) return;

    $mo("#moblock").show();
    createCard(pointerNumber);
}

/**
 * This function creates the cards and adds them on a calculated position.
 */
function createCard(pointerNumber) {
    let tourElement = moTour.tourData[pointerNumber];

    if (
        !$mo("#" + tourElement.targetE).is(":visible") &&
        (pointerNumber !== 0 || tourElement.targetE !== "")
    ) {
        const next = moTour.tourData[pointerNumber + 1];
        pointerNumber++;
        if (next && next.targetE && $mo("#" + next.targetE).is(":visible")) {
            createCard(pointerNumber);
        } else {
            resetTour();
            tourComplete();
            return;
        }
    }

    let safeTitleHTML = tourElement.titleHTML || "";
    let safeContentHTML = tourElement.contentHTML || "";
    let safeButtonText = tourElement.buttonText || "";
    let safeImgSrc = tourElement.img || "";

    let card =
        '<div id="mo-card" class="mo-card mo-' +
        tourElement.cardSize +
        '">' +
        '<div class="mo-tour-arrow mo-point-' +
        tourElement.pointToSide +
        '">' +
        '<i style="color:#ffffff;position: relative;" ' +
        'class="mo-dashicons dashicons dashicons-arrow-' +
        tourElement.pointToSide +
        '"></i>' +
        "</div>" +
        '<div class="mo-tour-content-area mo-point-' +
        tourElement.pointToSide +
        ' pt-mo-4">' +
        '<div class="mo-tour-title"></div>' +
        '<div class="mo-tour-content"></div>' +
        '<div id="tour_svg"><img ' +
        (safeImgSrc ? "" : "hidden") +
        ' src="' +
        safeImgSrc +
        '" style="margin:auto;" alt=""></div>' +
        '<div class="mo-tour-button-area flex flex-2 gap-mo-4 pr-mo-8"></div>' +
        "</div>" +
        "</div>";

    let nextButton =
        '<input type="button" class="mo-button inverted mo-tour-primary-btn" style="width:100% !important;" value="' +
        safeButtonText +
        '">';
    let skipButton =
        '<input type="button" class="mo-button secondary mo-skip-btn" style="margin-left:30px;" value="Skip Tour">';

    $mo("#moblock").empty();
    $mo(card).insertAfter("#moblock");

    $mo(".mo-tour-title").html(safeTitleHTML);
    $mo(".mo-tour-content").html(safeContentHTML);

    $mo(".mo-tour-button-area").append(skipButton).append(nextButton);

    if (tourElement.pointToSide === "" || tourElement.pointToSide === "center") {
        $mo(".mo-card").attr("style", "box-shadow:0px 0px 0px 3px #979393");
    }

    if (tourElement.targetE) {
        getPointerPosition(tourElement.targetE, tourElement.pointToSide);
    }

    // Handle "Next" button
    $mo(".mo-tour-primary-btn").click(function () {
        $mo(".mo-target-index").removeClass("mo-target-index");
        $mo(".mo-card").remove();
        pointerNumber++;
        if (moTour.tourData[pointerNumber]) {
            createCard(pointerNumber);
        } else {
            resetTour();
            tourComplete();
        }
    });

    // Handle "Skip" button
    $mo(".mo-skip-btn").click(function () {
        $mo(".mo-target-index").removeClass("mo-target-index");
        $mo(".mo-card").remove();
        resetTour();
        tourComplete();
    });
}

/**
 * This function calculates the Top and Left position for the card
 * relative to the target element.
 */
function getPointerPosition(targetE, pointToSide) {
    let targetRect = document.getElementById(targetE).getBoundingClientRect();
    let cardRect = document.getElementById("mo-card").getBoundingClientRect();

    let finalLeft, finalTop;

    switch (pointToSide) {
        case "up":
            finalLeft = targetRect.left + (targetRect.width - cardRect.width) / 2;
            finalTop = targetRect.top + targetRect.height + 5;
            break;
        case "down":
            finalLeft = targetRect.left + (targetRect.width - cardRect.width) / 2;
            finalTop = targetRect.top - cardRect.height;
            break;
        case "left":
            finalLeft = targetRect.left + targetRect.width;
            finalTop = targetRect.top + (targetRect.height - cardRect.height) / 2;
            break;
        case "right":
            finalLeft = targetRect.left - cardRect.width;
            finalTop = targetRect.top + (targetRect.height - cardRect.height) / 2;
            break;
    }

    if (finalTop < 0) {
        $mo(".mo-tour-arrow>i").css("top", "calc(50% - 0.6em + " + finalTop + "px)");
        finalTop = 0;
    }
    $mo(".mo-card").css({
        top: finalTop + $mo(window).scrollTop() - 25,
        left: finalLeft + $mo(window).scrollLeft() - 180,
        "margin-top": "0",
        "margin-left": "0",
        position: "absolute",
    });

    $mo("#" + targetE).addClass("mo-target-index");

    document.getElementById(targetE).scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
    });
}

/**
 * Removes overlay and resets tour.
 */
function resetTour() {
    pointerNumber = 0;
    $mo("#moblock").hide();
}

/**
 * When the last element is reached, mark tour as complete.
 */
function tourComplete() {
    $mo.ajax({
        url: moTour.siteURL,
        type: "POST",
        data: {
            doneTour: true,
            pageID: moTour.pageID,
            security: moTour.tnonce,
            action: moTour.ajaxAction,
        },
        crossDomain: true,
        dataType: "json",
        success: function (response) {
        },
        error: function (xhr, status, error) {
            console.error("AJAX Error:", error);
        },
    });
}
