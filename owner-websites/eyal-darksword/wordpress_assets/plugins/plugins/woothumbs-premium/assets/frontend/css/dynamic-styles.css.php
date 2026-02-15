<?php
/**
 * Dynamic Styles
 *
 * @package iconic-woothumbs
 */

global $iconic_woothumbs_class;

$core_settings = $iconic_woothumbs_class->settings;
$layout        = $core_settings[ 'display_general_layout' ];
$is_stacked    = ( 'stacked' === $layout );
?>
<style>
/* Default Styles */
.iconic-woothumbs-all-images-wrap {
	float: <?php echo esc_html( $core_settings[ 'display_general_position' ] ); ?>;
	width: <?php echo esc_html( $core_settings[ 'display_general_width' ] ); ?>%;
}

/* Icon Styles */
.iconic-woothumbs-icon {
	color: <?php echo esc_html( $core_settings[ 'display_general_gallery_colour_primary' ] ); ?>;
}

/* Bullet Styles */
.iconic-woothumbs-all-images-wrap .slick-dots button,
.iconic-woothumbs-zoom-bullets .slick-dots button {
	border-color: <?php echo esc_html( $core_settings[ 'display_general_gallery_colour_primary' ] ); ?> !important;
}

.iconic-woothumbs-all-images-wrap .slick-dots .slick-active button,
.iconic-woothumbs-zoom-bullets .slick-dots .slick-active button {
	background-color: <?php echo esc_html( $core_settings[ 'display_general_gallery_colour_primary' ] ); ?> !important;
}

/* Thumbnails */
<?php
if ( ! $is_stacked && $core_settings[ 'navigation_thumbnails_enable' ] ) {
	$thumbnails_width = (int) $core_settings[ 'navigation_thumbnails_width' ];
	?>
	.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-thumbnails-wrap,
	.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-thumbnails-wrap {
		width: <?php echo esc_html( $core_settings[ 'navigation_thumbnails_width' ] ); ?>%;
	}

	.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-images-wrap,
	.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-images-wrap {
		width: <?php echo 100 - esc_html( $thumbnails_width ); ?>%;
	}
	<?php
} else {
	?>
	.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-images-wrap,
	.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-images-wrap {
		width: 100%;
	}
	<?php
}
?>

.iconic-woothumbs-thumbnails__image-wrapper:after {
	border-color: <?php echo esc_html( $core_settings[ 'display_general_gallery_colour_primary' ] ); ?>;
}

.iconic-woothumbs-thumbnails__control {
	color: <?php echo esc_html( $core_settings[ 'display_general_gallery_colour_primary' ] ); ?>;
}

.iconic-woothumbs-thumbnails__control path {
	stroke: <?php echo esc_html( $core_settings[ 'display_general_gallery_colour_primary' ] ); ?>;
}

.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-thumbnails__control {
	right: <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px;
}

.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-thumbnails__control {
	left: <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px;
}

<?php
$thumbnail_width = Iconic_WooThumbs_Settings::get_thumbnail_width();
?>

/* Stacked Thumbnails - Left & Right */
.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-thumbnails-wrap--stacked,
.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-thumbnails-wrap--stacked {
	margin: 0;
}

.iconic-woothumbs-thumbnails-wrap--stacked .iconic-woothumbs-thumbnails__slide {
	width: <?php echo esc_html( $thumbnail_width ); ?>%;
}

/* Stacked Thumbnails - Left */
.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-thumbnails-wrap--stacked .iconic-woothumbs-thumbnails__slide {
	padding: 0 <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px 0;
}

/* Stacked Thumbnails - Right */
.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-thumbnails-wrap--stacked .iconic-woothumbs-thumbnails__slide {
	padding: 0 0 <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px;
}

/* Stacked Thumbnails - Above & Below */
<?php
$thumbnail_gutter_left  = floor( $core_settings[ 'navigation_thumbnails_spacing' ] / 2 );
$thumbnail_gutter_right = ceil( $core_settings[ 'navigation_thumbnails_spacing' ] / 2 );
?>

.iconic-woothumbs-all-images-wrap--thumbnails-above .iconic-woothumbs-thumbnails-wrap--stacked,
.iconic-woothumbs-all-images-wrap--thumbnails-below .iconic-woothumbs-thumbnails-wrap--stacked {
	margin: 0 -<?php echo esc_html( $thumbnail_gutter_left ); ?>px 0 -<?php echo esc_html( $thumbnail_gutter_right ); ?>px;
}

/* Stacked Thumbnails - Above */
.iconic-woothumbs-all-images-wrap--thumbnails-above .iconic-woothumbs-thumbnails-wrap--stacked .iconic-woothumbs-thumbnails__slide {
	padding: 0 <?php echo esc_html( $thumbnail_gutter_left ); ?>px <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px <?php echo esc_html( $thumbnail_gutter_right ); ?>px;
}

/* Stacked Thumbnails - Below */
.iconic-woothumbs-all-images-wrap--thumbnails-below .iconic-woothumbs-thumbnails-wrap--stacked .iconic-woothumbs-thumbnails__slide {
	padding: <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px <?php echo esc_html( $thumbnail_gutter_left ); ?>px 0 <?php echo esc_html( $thumbnail_gutter_right ); ?>px;
}

/* Sliding Thumbnails - Left & Right, Above & Below */
.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-thumbnails-wrap--sliding,
.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-thumbnails-wrap--sliding {
	margin: 0;
}

/* Sliding Thumbnails - Left & Right */
.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-thumbnails-wrap--sliding .slick-list,
.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-thumbnails-wrap--sliding .slick-list {
	margin-bottom: -<?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px;
}

.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-thumbnails-wrap--sliding .slick-slide,
.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-thumbnails-wrap--sliding .slick-slide {
	margin-bottom: <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px;
}

/* Sliding Thumbnails - Left */
.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-thumbnails-wrap--sliding {
	padding-right: <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px;
}

/* Sliding Thumbnails - Right */
.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-thumbnails-wrap--sliding {
	padding-left: <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px;
}

/* Sliding Thumbnails - Above & Below */
.iconic-woothumbs-thumbnails-wrap--horizontal.iconic-woothumbs-thumbnails-wrap--sliding .iconic-woothumbs-thumbnails__slide {
	width: <?php echo esc_html( $thumbnail_width ); ?>%;
}

.iconic-woothumbs-all-images-wrap--thumbnails-above .iconic-woothumbs-thumbnails-wrap--sliding .slick-list,
.iconic-woothumbs-all-images-wrap--thumbnails-below .iconic-woothumbs-thumbnails-wrap--sliding .slick-list {
	margin-right: -<?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px;
}

.iconic-woothumbs-all-images-wrap--thumbnails-above .iconic-woothumbs-thumbnails-wrap--sliding .slick-slide,
.iconic-woothumbs-all-images-wrap--thumbnails-below .iconic-woothumbs-thumbnails-wrap--sliding .slick-slide {
	margin-right: <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px;
}

/* Sliding Thumbnails - Above */
.iconic-woothumbs-all-images-wrap--thumbnails-above .iconic-woothumbs-thumbnails-wrap--sliding {
	margin-bottom: <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px;
}

/* Sliding Thumbnails - Below */
.iconic-woothumbs-all-images-wrap--thumbnails-below .iconic-woothumbs-thumbnails-wrap--sliding {
	margin-top: <?php echo esc_html( $core_settings[ 'navigation_thumbnails_spacing' ] ); ?>px;
}

/* Zoom Styles */
<?php
if ( $core_settings[ 'zoom_general_zoom_type' ] === 'follow' ) {
	$border_radius = ( $core_settings[ 'zoom_outside_follow_zoom_lens_width' ] > $core_settings[ 'zoom_outside_follow_zoom_lens_height' ] ) ? $core_settings[ 'zoom_outside_follow_zoom_lens_width' ] : $core_settings[ 'zoom_outside_follow_zoom_lens_height' ];
	?>
	.zm-viewer.shapecircular {
		-webkit-border-radius: <?php echo esc_html( $border_radius ); ?>px;
		-moz-border-radius: <?php echo esc_html( $border_radius ); ?>px;
		border-radius: <?php echo esc_html( $border_radius ); ?>px;
	}
	<?php
}
?>

.zm-handlerarea {
	background: <?php echo esc_html( $core_settings[ 'zoom_outside_zoom_lens_colour' ] ); ?>;
	-ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=<?php echo esc_html( $core_settings[ 'zoom_outside_zoom_lens_opacity' ] ) * 100; ?>)" !important;
	filter: alpha(opacity=<?php echo esc_html( $core_settings[ 'zoom_outside_zoom_lens_opacity' ] ) * 100; ?>) !important;
	-moz-opacity: <?php echo esc_html( $core_settings[ 'zoom_outside_zoom_lens_opacity' ] ); ?> !important;
	-khtml-opacity: <?php echo esc_html( $core_settings[ 'zoom_outside_zoom_lens_opacity' ] ); ?> !important;
	opacity: <?php echo esc_html( $core_settings[ 'zoom_outside_zoom_lens_opacity' ] ); ?> !important;
}

/* Layout Styles */
<?php
$stacked_spacing = $core_settings[ 'images_general_spacing' ];
if ( $is_stacked && $stacked_spacing >= 0 ) {
	?>
	/* Set the gap spacing for grid elements */
	.iconic-woothumbs-images--grid {
		gap: <?php echo esc_html( $stacked_spacing ); ?>px;
	}

	/* Layout 1 */
	.iconic-woothumbs-images--grid-one .iconic-woothumbs-images__slide {
		flex: 0 0 calc( 100% - <?php echo esc_html( $stacked_spacing ); ?>px );
	}

	/* Layout 2 */
	.iconic-woothumbs-images--grid-two .iconic-woothumbs-images__slide {
		flex: 0 0 calc( 50% - <?php echo esc_html( $stacked_spacing / 2 ); ?>px );
		max-width: calc( 50% - <?php echo esc_html( $stacked_spacing / 2 ); ?>px );
	}

	/* Layout 3 */
	.iconic-woothumbs-images--grid-three .iconic-woothumbs-images__slide {
		flex: 0 0 calc( 100%/3 - <?php echo esc_html( $stacked_spacing ); ?>px );
		max-width: calc( 100%/3 - <?php echo esc_html( $stacked_spacing ); ?>px );
	}

	/* Layout 4 */
	.iconic-woothumbs-images--grid-four .iconic-woothumbs-images__slide {
		flex: 0 0 calc( 50% - <?php echo esc_html( $stacked_spacing / 2 ); ?>px );
		max-width: calc( 50% - <?php echo esc_html( $stacked_spacing / 2 ); ?>px );
	}

	.iconic-woothumbs-images--grid-four .iconic-woothumbs-images__slide:nth-of-type(1) {
		flex: 0 0 100%;
		max-width: none;
	}

	.iconic-woothumbs-images--grid-four .iconic-woothumbs-images__slide:nth-of-type(2),
	.iconic-woothumbs-images--grid-four .iconic-woothumbs-images__slide:nth-of-type(3),
	.iconic-woothumbs-images--grid-four .iconic-woothumbs-images__slide:nth-of-type(4) {
		flex: 0 0 calc( 100%/3 - ( <?php echo esc_html( $stacked_spacing ); ?>px * 2 / 3 ) );
	}

	/* Layout 5 */
	.iconic-woothumbs-images--grid-five .iconic-woothumbs-images__slide {
		flex: 0 0 calc( 100%/3 - ( <?php echo esc_html( $stacked_spacing ); ?>px * 2 / 3 ) );
		max-width: calc( 100%/3 - ( <?php echo esc_html( $stacked_spacing ); ?>px * 2 / 3 ) );
	}

	.iconic-woothumbs-images--grid-five .iconic-woothumbs-images__slide:nth-of-type(1) {
		flex: 0 0 100%;
		max-width: none;
	}
	.iconic-woothumbs-images--grid-five .iconic-woothumbs-images__slide:nth-of-type(2),
	.iconic-woothumbs-images--grid-five .iconic-woothumbs-images__slide:nth-of-type(3) {
		flex: 0 0 calc( 50% - <?php echo esc_html( $stacked_spacing / 2 ); ?>px);
		max-width: calc( 50% - <?php echo esc_html( $stacked_spacing / 2 ); ?>px);
	}

	/* Layout 6 */
	.iconic-woothumbs-images--grid-six .iconic-woothumbs-images__slide:not(.iconic-woothumbs-images__slide--featured) {
		flex: 0 0 calc( 50% - <?php echo esc_html( $stacked_spacing / 2 ); ?>px );
		max-width: calc( 50% - <?php echo esc_html( $stacked_spacing / 2 ); ?>px );
	}

	.iconic-woothumbs-images--grid-six .iconic-woothumbs-images__slide:nth-of-type(1) {
		flex: 0 0 100%;
		max-width: none;
	}

	/* Layout 7 */
	.iconic-woothumbs-images--grid-seven .iconic-woothumbs-images__slide:not(.iconic-woothumbs-images__slide--featured) {
		flex: 0 0 calc( 100%/3 - ( <?php echo esc_html( $stacked_spacing ); ?>px * 2 / 3 ) );
		max-width: calc( 100%/3 - ( <?php echo esc_html( $stacked_spacing ); ?>px * 2 / 3 ) );
	}

	.iconic-woothumbs-images--grid-seven .iconic-woothumbs-images__slide:nth-of-type(1) {
		flex: 0 0 100%;
		max-width: none;
	}
	<?php
}
?>

/* Media Queries */
<?php
if ( $core_settings[ 'mobile_general_breakpoint_enable' ] ) {
	$thumbnails_count = (int) $core_settings[ 'mobile_general_thumbnails_count' ];
	$thumbnail_width  = $thumbnails_count ? 100 / $thumbnails_count : $thumbnail_width;
	?>

	@media screen and (max-width: <?php echo esc_html( $core_settings[ 'mobile_general_breakpoint' ] ); ?>px) {

		.iconic-woothumbs-all-images-wrap {
			float: <?php echo esc_html( $core_settings[ 'mobile_general_position' ] ); ?>;
			width: <?php echo esc_html( $core_settings[ 'mobile_general_width' ] ); ?>%;
		}

		.iconic-woothumbs-hover-icons .iconic-woothumbs-icon {
			opacity: 1;
		}

	<?php
	if ( $core_settings[ 'mobile_general_thumbnails_below' ] ) {
		?>
		.iconic-woothumbs-all-images-wrap--thumbnails-above .iconic-woothumbs-images-wrap,
		.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-images-wrap,
		.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-images-wrap {
			width: 100%;
		}

		.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-thumbnails-wrap,
		.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-thumbnails-wrap {
			width: 100%;
		}
		<?php
	}
	?>

	.iconic-woothumbs-thumbnails-wrap--horizontal .iconic-woothumbs-thumbnails__slide {
		width: <?php echo esc_html( $thumbnail_width ); ?>%;
	}

	<?php
	// If the mobile thumbnail count has been set to zero, then we should
	// use the mobile general width value for the images wrap, overriding
	// whatever the desktop value is.
	if ( ! $is_stacked && 0 === $thumbnails_count ) {
		?>
		.iconic-woothumbs-all-images-wrap--thumbnails-left .iconic-woothumbs-images-wrap,
		.iconic-woothumbs-all-images-wrap--thumbnails-right .iconic-woothumbs-images-wrap {
			width: <?php echo esc_html( $core_settings[ 'mobile_general_width' ] ); ?>%;
		}
		<?php
	}
	?>
	}
	<?php
}

$fg_colour = $core_settings[ 'display_general_gallery_colour_primary' ];
$bg_colour = $core_settings[ 'display_general_gallery_colour_secondary' ];

if ( $fg_colour && $bg_colour ) {
	?>
	.plyr {
		--plyr-control-icon-size: 18px;
		--plyr-color-main: <?php echo esc_html( $bg_colour ); ?>;
		--plyr-svg-fill: <?php echo esc_html( $fg_colour ); ?>;
		/* General */
		--plyr-menu-border-shadow-color: <?php echo esc_html( $bg_colour ); ?>;
		--plyr-range-thumb-background: <?php echo esc_html( $fg_colour ); ?>;
		--plyr-badge-text-color: <?php echo esc_html( $fg_colour ); ?>;
		--plyr-captions-text-color: <?php echo esc_html( $fg_colour ); ?>;
		--plyr-font-smoothing: true;
		/* Video */
		--plyr-video-background: <?php echo esc_html( $bg_colour ); ?>;
		--plyr-video-control-color: <?php echo esc_html( $fg_colour ); ?>;
		--plyr-video-control-color-hover: <?php echo esc_html( $fg_colour ); ?>;
		/* Audio */
		--plyr-audio-control-color-hover: <?php echo esc_html( $fg_colour ); ?>;
		--plyr-audio-control-background-hover: <?php echo esc_html( $bg_colour ); ?>80;
	}

	/* Background property with foreground colour setting and opacity */
	.plyr__control.plyr__control--overlaid[data-plyr="play"] {
		/* Final two characters add 50% opacity */
		background: <?php echo esc_html( $bg_colour ); ?>80 !important;
		color: <?php echo esc_html( $fg_colour ); ?> !important;
	}

	/* Background property with foreground colour setting */
	.plyr__control.plyr__control--overlaid[data-plyr="play"]:hover {
		background: <?php echo esc_html( $fg_colour ); ?> !important;
	}

	/* Color property with foreground colour setting */
	.plyr__progress [data-plyr="seek"],
	.plyr__volume [data-plyr="volume"] {
		color: <?php echo esc_html( $fg_colour ); ?> !important;
	}

	/* SVG stroke + fill properties with background colour setting */
	.plyr__control.plyr__control--overlaid[data-plyr="play"]:hover svg {
		stroke: <?php echo esc_html( $bg_colour ); ?> !important;
		fill: <?php echo esc_html( $bg_colour ); ?> !important;
	}

	/* SVG stroke property with foreground colour setting */
	.plyr__control[data-plyr="play"],
	.plyr__control[data-plyr="fullscreen"],
	.iconic-woothumbs-fullscreen svg path:not(:last-child),
	.iconic-woothumbs-images__arrow svg path,
	.iconic-woothumbs-zoom-prev svg path,
	.iconic-woothumbs-zoom-next svg path,
	.iconic-woothumbs-wishlist-buttons__add svg path {
		stroke: <?php echo esc_html( $fg_colour ); ?> !important;
	}

	/* SVG fill property with foreground colour setting */
	.plyr__control[data-plyr="play"],
	.plyr__control[data-plyr="settings"],
	.iconic-woothumbs-thumbnails__play-overlay svg path,
	.iconic-woothumbs-fullscreen svg path:last-child,
	.iconic-woothumbs-play svg path,
	.iconic-woothumbs-wishlist-buttons__browse svg path,
	.iconic-woothumbs-images__slide .iconic-woothumbs-loading-overlay--inner svg path,
	.pswp_item .iconic-woothumbs-loading-overlay--inner svg path {
		fill: <?php echo esc_html( $fg_colour ); ?> !important;
	}

	/* Background color property with background colour setting */
	.iconic-woothumbs-thumbnails__control:hover,
	.iconic-woothumbs-images__slide .iconic-woothumbs-loading-overlay:has(.iconic-woothumbs-responsive-media),
	.iconic-woothumbs-images__slide .iconic-woothumbs-loading-overlay--inner,
	.pswp_item .iconic-woothumbs-loading-overlay--inner {
		background-color: <?php echo esc_html( $bg_colour ); ?> !important;
	}

	/* Background color property with background colour setting and opacity */
	.iconic-woothumbs-thumbnails__play-overlay,
	.iconic-woothumbs-thumbnails__control {
		/* Final two characters add 50% opacity */
		background-color: <?php echo esc_html( $bg_colour ); ?>80 !important;
	}

	/* Background color property with foreground colour setting */
	.iconic-woothumbs-all-images-wrap .slick-dots li button,
	.iconic-woothumbs-zoom-bullets .slick-dots li button,
	.iconic-woothumbs-zoom-bullets .slick-dots li.slick-active button,
	.plyr__menu__container .plyr__control[role="menuitemradio"]:hover::before {
		background-color: <?php echo esc_html( $fg_colour ); ?> !important;
	}

	/* Misc */
	.iconic-woothumbs-thumbnails__image-wrapper:after {
		border: 2px solid <?php echo esc_html( $bg_colour ); ?>;
	}

	.iconic-woothumbs-thumbnails__image-wrapper:before {
		border: 2px solid <?php echo esc_html( $fg_colour ); ?>;
	}
	<?php
}
?>
</style>
