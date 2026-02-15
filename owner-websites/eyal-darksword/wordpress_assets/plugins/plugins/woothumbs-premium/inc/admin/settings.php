<?php
/**
 * Register WooThumbs settings.
 *
 * @package iconic-woothumbs
 */

add_filter( 'wpsf_register_settings_iconic_woothumbs', 'iconic_woothumbs_settings' );

/**
 * WooThumbs Settings
 *
 * @param array $wpsf_settings WPSF settings.
 *
 * @return array
 */
function iconic_woothumbs_settings( $wpsf_settings ) {
	$wpsf_settings['tabs']     = isset( $wpsf_settings['tabs'] ) ? $wpsf_settings['tabs'] : array();
	$wpsf_settings['sections'] = isset( $wpsf_settings['sections'] ) ? $wpsf_settings['sections'] : array();

	// Tabs.

	$wpsf_settings['tabs'][] = array(
		'id'    => 'display',
		'title' => esc_html__( 'Display', 'iconic-woothumbs' ),
	);

	$wpsf_settings['tabs'][] = array(
		'id'      => 'carousel',
		'title'   => esc_html__( 'Slider', 'iconic-woothumbs' ),
		'show_if' => array(
			array(
				'field' => 'display_general_layout',
				'value' => array( 'slider' ),
			),
		),
	);

	$wpsf_settings['tabs'][] = array(
		'id'      => 'stacked',
		'title'   => esc_html__( 'Stacked', 'iconic-woothumbs' ),
		'show_if' => array(
			array(
				'field' => 'display_general_layout',
				'value' => array( 'stacked' ),
			),
		),
	);

	$wpsf_settings['tabs'][] = array(
		'id'      => 'navigation',
		'title'   => esc_html__( 'Slider Navigation', 'iconic-woothumbs' ),
		'show_if' => array(
			array(
				'field' => 'display_general_layout',
				'value' => array( 'slider' ),
			),
		),
	);

	$wpsf_settings['tabs'][] = array(
		'id'    => 'media',
		'title' => esc_html__( 'Video', 'iconic-woothumbs' ),
	);

	$wpsf_settings['tabs'][] = array(
		'id'    => 'zoom',
		'title' => esc_html__( 'Zoom', 'iconic-woothumbs' ),
	);

	$wpsf_settings['tabs'][] = array(
		'id'    => 'fullscreen',
		'title' => esc_html__( 'Fullscreen', 'iconic-woothumbs' ),
	);

	$wpsf_settings['tabs'][] = array(
		'id'    => 'mobile',
		'title' => esc_html__( 'Mobile', 'iconic-woothumbs' ),
	);

	$wpsf_settings['tabs'][] = array(
		'id'    => 'performance',
		'title' => esc_html__( 'Performance', 'iconic-woothumbs' ),
	);

	// Sections.

	$default_width = Iconic_WooThumbs_Settings::get_default_width();

	$wpsf_settings['sections']['display'] = array(
		'tab_id'              => 'display',
		'section_id'          => 'general',
		'section_title'       => esc_html__( 'Display Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 0,
		'fields'              => array(
			array(
				'id'       => 'layout',
				'title'    => esc_html__( 'Gallery Layout', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose a layout style for your product images.', 'iconic-woothumbs' ),
				'type'     => 'image_radio',
				'default'  => 'slider',
				'choices'  => array(
					'slider'  => array(
						'text'  => esc_html__( 'Slider', 'iconic-woothumbs' ),
						'image' => ICONIC_WOOTHUMBS_URL . '/assets/admin/img/layout-slider.png',
					),
					'stacked' => array(
						'text'  => esc_html__( 'Stacked', 'iconic-woothumbs' ),
						'image' => ICONIC_WOOTHUMBS_URL . '/assets/admin/img/layout-stacked.png',
					),
				),
			),
			array(
				'id'       => 'stacked_layout',
				'title'    => esc_html__( 'Stacked Layout', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose a layout style for your product images in the stacked gallery.', 'iconic-woothumbs' ),
				'type'     => 'image_radio',
				'default'  => 'one',
				'choices'  => array(
					'one'   => array(
						'text'  => esc_html__( 'Layout 1', 'iconic-woothumbs' ),
						'image' => ICONIC_WOOTHUMBS_URL . '/assets/admin/img/stacked-preset-one.png',
					),
					'two'   => array(
						'text'  => esc_html__( 'Layout 2', 'iconic-woothumbs' ),
						'image' => ICONIC_WOOTHUMBS_URL . '/assets/admin/img/stacked-preset-two.png',
					),
					'three' => array(
						'text'  => esc_html__( 'Layout 3', 'iconic-woothumbs' ),
						'image' => ICONIC_WOOTHUMBS_URL . '/assets/admin/img/stacked-preset-three.png',
					),
					'four'  => array(
						'text'  => esc_html__( 'Layout 4', 'iconic-woothumbs' ),
						'image' => ICONIC_WOOTHUMBS_URL . '/assets/admin/img/stacked-preset-four.png',
					),
					'five'  => array(
						'text'  => esc_html__( 'Layout 5', 'iconic-woothumbs' ),
						'image' => ICONIC_WOOTHUMBS_URL . '/assets/admin/img/stacked-preset-five.png',
					),
					'six'   => array(
						'text'  => esc_html__( 'Layout 6', 'iconic-woothumbs' ),
						'image' => ICONIC_WOOTHUMBS_URL . '/assets/admin/img/stacked-preset-six.png',
					),
					'seven' => array(
						'text'  => esc_html__( 'Layout 7', 'iconic-woothumbs' ),
						'image' => ICONIC_WOOTHUMBS_URL . '/assets/admin/img/stacked-preset-seven.png',
					),
				),
				'show_if'  => array(
					array(
						'field' => 'display_general_layout',
						'value' => array( 'stacked' ),
					),
				),
			),
			array(
				'id'       => 'width',
				'title'    => esc_html__( 'Gallery Width (%)', 'iconic-woothumbs' ),
				'subtitle' => sprintf(
					/* translators: numeric percentage value */
					esc_html__( 'Enter a percentage for the width of the image gallery. The default for your theme is %d%%. For block themes this should be 100%%.', 'iconic-woothumbs' ),
					$default_width
				),
				'type'     => 'number',
				'default'  => $default_width,
			),
			array(
				'id'       => 'position',
				'title'    => esc_html__( 'Gallery Position', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose a position for the images. Go to the Mobile tab to change the position at a certain breakpoint.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => 'left',
				'choices'  => array(
					'left'  => esc_html__( 'Left', 'iconic-woothumbs' ),
					'right' => esc_html__( 'Right', 'iconic-woothumbs' ),
					'none'  => esc_html__( 'None', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'maintain_gallery',
				'title'    => esc_html__( 'Use Gallery Images for Variations and Attributes?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, the parent variable product image gallery will be added to its product variations and attributes.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '0',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
					'2' => esc_html__( 'Only if variation has no gallery images', 'iconic-woothumbs' ),
				),
				'name'     => 'variations_settings_maintain_gallery',
			),
			array(
				'id'       => 'gallery_colour_primary',
				'title'    => esc_html__( 'UI Foreground Colour', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose a colour that will be mainly used as a foreground colour for icons in the gallery. Does not apply to the fullscreen gallery.', 'iconic-woothumbs' ),
				'type'     => 'color',
				'default'  => '#ffffff',
			),
			array(
				'id'       => 'gallery_colour_secondary',
				'title'    => esc_html__( 'UI Background Colour', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose a colour that will be mainly used as a background colour for icons in the gallery. Does not apply to the fullscreen gallery.', 'iconic-woothumbs' ),
				'type'     => 'color',
				'default'  => '#111111',
			),
			array(
				'id'       => 'icons_hover',
				'title'    => esc_html__( 'Show Icons on Hover?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, icons will only be visible when the image is hovered.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '0',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'icons_tooltips',
				'title'    => esc_html__( 'Show Icon Tooltips?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When icons are hovered, a tooltip will be displayed.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '0',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
		),
	);

	$wpsf_settings['sections']['images'] = array(
		'tab_id'              => 'display',
		'section_id'          => 'images',
		'section_title'       => esc_html__( 'Image Sizes', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 0,
		'fields'              => array(
			'single_image_width'            => array(
				'id'       => 'single_image_width',
				'title'    => esc_html__( 'Single Image Width (px)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'For a mobile site, set this to the largest size your single image will be. Images will be regenerated automatically, but may take time to appear on the frontend.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => Iconic_WooThumbs_Images::get_image_width( 'single' ),
			),
			'single_image_crop'             => array(
				'id'       => 'single_image_crop',
				'title'    => esc_html__( 'Single Image Crop Ratio', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Common examples: 1:1, 4:6, 16:9. If empty, no cropping will occur. Once changed, product gallery images will be regenerated automatically, but may take time to appear on the frontend.', 'iconic-woothumbs' ),
				'type'     => 'custom',
				'default'  => Iconic_WooThumbs_Settings::ratio_fields(
					array(
						'name'   => 'display_images_single_image_crop',
						'width'  => Iconic_WooThumbs_Images::get_image_crop( 'single', 'width' ),
						'height' => Iconic_WooThumbs_Images::get_image_crop( 'single', 'height' ),
					)
				),
			),
			'gallery_thumbnail_image_width' => array(
				'id'       => 'gallery_thumbnail_image_width',
				'title'    => esc_html__( 'Thumbnail Image Width (px)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Images will be regenerated automatically, but may take time to appear on the frontend.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => Iconic_WooThumbs_Images::get_image_width( 'gallery_thumbnail' ),
			),
			'gallery_thumbnail_image_crop'  => array(
				'id'       => 'gallery_thumbnail_image_crop',
				'title'    => esc_html__( 'Thumbnail Image Crop Ratio', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Common examples: 1:1, 4:6, 16:9. If empty, no cropping will occur. Once changed, thumbnail images will be regenerated automatically, but may take time to appear on the frontend.', 'iconic-woothumbs' ),
				'type'     => 'custom',
				'default'  => Iconic_WooThumbs_Settings::ratio_fields(
					array(
						'name'   => 'display_images_gallery_thumbnail_image_crop',
						'width'  => Iconic_WooThumbs_Images::get_image_crop( 'gallery_thumbnail', 'width' ),
						'height' => Iconic_WooThumbs_Images::get_image_crop( 'gallery_thumbnail', 'height' ),
					)
				),
			),
			array(
				'id'       => 'large_image_size',
				'title'    => esc_html__( 'Large Image Size', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose a size for large images. Hover zoom and fullscreen will both use the size you select here.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => 'full',
				'choices'  => Iconic_WooThumbs_Settings::get_image_sizes(),
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'stacked',
		'section_id'          => 'general',
		'section_title'       => esc_html__( 'Stacked', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 0,
		'fields'              => array(
			array(
				'id'       => 'spacing',
				'title'    => esc_html__( 'Spacing (px)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'The spacing between images when stacked.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 20,
				'show_if'  => array(
					array(
						'field' => 'display_general_layout',
						'value' => array( 'stacked' ),
					),
				),
				'name'     => 'images_general_spacing',
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'media',
		'section_id'          => 'general',
		'section_title'       => esc_html__( 'General Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 0,
		'fields'              => array(
			array(
				'id'       => 'controls',
				'title'    => esc_html__( 'Show Controls?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, the video controls will be visible.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'controls_list',
				'title'    => esc_html__( 'Available Controls', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose the video controls that should be available to users.', 'iconic-woothumbs' ),
				'type'     => 'checkboxes',
				'default'  => array(
					'play-large',
					'play',
					'progress',
					'mute',
					'volume',
					'settings',
					'fullscreen',
				),
				'choices'  => array(
					'play-large' => esc_html__( 'Overlay: Play', 'iconic-woothumbs' ),
					'play'       => esc_html__( 'Toolbar: Play', 'iconic-woothumbs' ),
					'progress'   => esc_html__( 'Toolbar: Progress', 'iconic-woothumbs' ),
					'mute'       => esc_html__( 'Toolbar: Mute', 'iconic-woothumbs' ),
					'volume'     => esc_html__( 'Toolbar: Volume', 'iconic-woothumbs' ),
					'fullscreen' => esc_html__( 'Toolbar: Fullscreen', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'loop',
				'title'    => esc_html__( 'Loop?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, the video will loop continuously.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'autoplay',
				'title'    => esc_html__( 'Autoplay?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, the video will autoplay once the page has loaded. Note: autoplay may not work on all devices. Also, the videos will be muted.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '0',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'poster',
				'title'    => esc_html__( 'Enable Poster Images?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, gallery images will be used as poster images for both YouTube/Vimeo and MP4/WEBM videos. Uses the image size defined in Display Settings > Image Sizes > Large Image Size.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '0',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'media',
		'section_id'          => 'mp4',
		'section_title'       => esc_html__( 'MP4/WEBM Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 0,
		'fields'              => array(
			array(
				'id'       => 'lazyload',
				'title'    => esc_html__( 'Lazyload MP4/WEBM videos?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, videos will only be loaded when play button is clicked. Helps reduce pageload time.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '0',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'carousel',
		'section_id'          => 'general',
		'section_title'       => esc_html__( 'Carousel Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 0,
		'fields'              => array(
			array(
				'id'               => 'mode',
				'title'            => __( 'Mode', 'iconic-woothumbs' ),
				'subtitle'         => __( 'How should the main images transition?', 'iconic-woothumbs' ),
				'type'             => 'select',
				'default'          => 'horizontal',
				'choices'          => array(
					'horizontal' => __( 'Horizontal', 'iconic-woothumbs' ),
					'vertical'   => __( 'Vertical', 'iconic-woothumbs' ),
					'fade'       => __( 'Fade', 'iconic-woothumbs' ),
				),
				'conditional_desc' => array(
					'vertical' => __( 'Vertical mode needs all images and embeds to have the same aspect ratio, or the setting Display > Image Sizes > Single Image Crop Ratio enabled.', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'transition_speed',
				'title'    => esc_html__( 'Transition Speed (ms)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'The speed at which images slide or fade in milliseconds.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 250,
			),
			array(
				'id'       => 'autoplay',
				'title'    => esc_html__( 'Autoplay?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, the slider images will automatically transition.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '0',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'duration',
				'title'    => esc_html__( 'Slide Duration (ms)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'If you have autoplay set to true, then you can set the slide duration for each slide.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 5000,
			),
			array(
				'id'       => 'infinite_loop',
				'title'    => esc_html__( 'Enable Infinite Loop?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When you get to the last image, loop back to the first. Horizontal or Vertical modes only.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'main_slider_swipe_threshold',
				'title'    => esc_html__( 'Main Slider Touch Threshold', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'A bigger number means less swipe length is needed to advance the slider.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => '5',
			),
			array(
				'id'       => 'maintain_slide_index',
				'title'    => esc_html__( 'Maintain Slide Index?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, the slide index will be maintained upon changing images. For example, if you are viewing the second image in the slider, and change variation, the second image will be selected from the new images.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '0',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
				'show_if'  => array(
					array(
						'field' => 'display_general_layout',
						'value' => array( 'slider' ),
					),
				),
				'name'     => 'variations_settings_maintain_slide_index',
			),
			array(
				'id'       => 'lazyload_mode',
				'title'    => esc_html__( 'Lazyload Mode', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'In Anticipated mode, the next and previous images load before you switch to them. In On Demand mode, images load only when you switch to them. In both modes, the initial gallery and thumbnail images always load right away when the page opens.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => 'anticipated',
				'choices'  => array(
					'anticipated' => esc_html__( 'Anticipated', 'iconic-woothumbs' ),
					'ondemand'    => esc_html__( 'On Demand', 'iconic-woothumbs' ),
				),
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'navigation',
		'section_id'          => 'general',
		'section_title'       => esc_html__( 'General Navigation Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 10,
		'fields'              => array(
			array(
				'id'       => 'controls',
				'title'    => esc_html__( 'Enable Prev/Next Arrows?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'This will display prev/next arrows over the main slider image.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'navigation',
		'section_id'          => 'thumbnails',
		'section_title'       => esc_html__( 'Thumbnails Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 20,
		'fields'              => array(
			array(
				'id'       => 'enable',
				'title'    => esc_html__( 'Enable Thumbnails?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose whether to enable the thumbnail navigation.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'type',
				'title'    => esc_html__( 'Thumbnails Type', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose either sliding or stacked thumbnails.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => 'sliding',
				'choices'  => array(
					'sliding' => esc_html__( 'Sliding Thumbnails', 'iconic-woothumbs' ),
					'stacked' => esc_html__( 'Stacked Thumbnails', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'controls',
				'title'    => esc_html__( 'Enable Thumbnail Controls?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'If you are using sliding thumbnails, enable or disable the prev/next controls.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'position',
				'title'    => esc_html__( 'Thumbnails Position', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose where the thumbnails are positioned in relation to the main images.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => 'below',
				'choices'  => array(
					'above' => esc_html__( 'Above', 'iconic-woothumbs' ),
					'below' => esc_html__( 'Below', 'iconic-woothumbs' ),
					'left'  => esc_html__( 'Left', 'iconic-woothumbs' ),
					'right' => esc_html__( 'Right', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'change_on_thumb_hover',
				'title'    => esc_html__( 'Enable Change on Thumbnail Hover?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'If enabled, and you are using stacked thumbnails, the main gallery image will change when you hover over specific thumbnails, instead of when you click them.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
				'show_if'  => array(
					array(
						'field' => 'navigation_thumbnails_type',
						'value' => array( 'stacked' ),
					),
				),
			),
			array(
				'id'       => 'width',
				'title'    => esc_html__( 'Width (%)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'If you chose to position your thumbanils on the left or right, enter a percentage width for them.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 20,
			),
			array(
				'id'       => 'count',
				'title'    => esc_html__( 'Thumbnails Count', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'The number of thumbnails to display in a row.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 4,
			),
			array(
				'id'       => 'transition_speed',
				'title'    => esc_html__( 'Thumbnails Transition Speed (ms)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'The speed at which the sliding thumbnail navigation moves in milliseconds.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 250,
			),
			array(
				'id'       => 'spacing',
				'title'    => esc_html__( 'Thumbnails Spacing (px)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'The space between each thumbnail.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 10,
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'navigation',
		'section_id'          => 'bullets',
		'section_title'       => esc_html__( 'Bullets Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 30,
		'fields'              => array(
			array(
				'id'       => 'enable',
				'title'    => esc_html__( 'Enable Bullets?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose whether to enable the bullet navigation.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '0',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'zoom',
		'section_id'          => 'general',
		'section_title'       => esc_html__( 'General Zoom Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 10,
		'fields'              => array(
			array(
				'id'       => 'enable',
				'title'    => esc_html__( 'Enable Hover Zoom?', 'iconic-woothumbs' ),
				'subtitle' => '',
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'zoom_type',
				'title'    => esc_html__( 'Zoom Type', 'iconic-woothumbs' ),
				'subtitle' => '',
				'type'     => 'select',
				'default'  => 'inner',
				'choices'  => array(
					'inner'    => esc_html__( 'Inner', 'iconic-woothumbs' ),
					'standard' => esc_html__( 'Outside', 'iconic-woothumbs' ),
					'follow'   => esc_html__( 'Follow', 'iconic-woothumbs' ),
				),
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'zoom',
		'section_id'          => 'outside_follow_zoom',
		'section_title'       => esc_html__( 'Outside and Follow Zoom Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 20,
		'fields'              => array(
			array(
				'id'       => 'lens_width',
				'title'    => esc_html__( 'Lens Width (px)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'The width of your zoom lens.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 200,
			),
			array(
				'id'       => 'lens_height',
				'title'    => esc_html__( 'Lens Height (px)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'The height of your zoom lens.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 200,
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'zoom',
		'section_id'          => 'outside_zoom',
		'section_title'       => esc_html__( 'Outside Zoom Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 30,
		'fields'              => array(
			array(
				'id'       => 'zoom_position',
				'title'    => esc_html__( 'Zoom Position', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose the position of your zoomed image in relation to the main image.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => 'right',
				'choices'  => array(
					'right' => esc_html__( 'Right', 'iconic-woothumbs' ),
					'left'  => esc_html__( 'Left', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'lens_colour',
				'title'    => esc_html__( 'Lens Colour', 'iconic-woothumbs' ),
				'subtitle' => '',
				'type'     => 'color',
				'default'  => '#000000',
			),
			array(
				'id'       => 'lens_opacity',
				'title'    => esc_html__( 'Lens opacity', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Set an opacity between 0 and 1 for the lens.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 0.8,
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'zoom',
		'section_id'          => 'follow_zoom',
		'section_title'       => esc_html__( 'Follow Zoom Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 40,
		'fields'              => array(
			array(
				'id'       => 'zoom_shape',
				'title'    => esc_html__( 'Zoom Shape', 'iconic-woothumbs' ),
				'subtitle' => '',
				'type'     => 'select',
				'default'  => 'circular',
				'choices'  => array(
					'circular' => esc_html__( 'Circular', 'iconic-woothumbs' ),
					'square'   => esc_html__( 'Square', 'iconic-woothumbs' ),
				),
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'fullscreen',
		'section_id'          => 'general',
		'section_title'       => esc_html__( 'Fullscreen Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 0,
		'fields'              => array(
			array(
				'id'       => 'enable',
				'title'    => esc_html__( 'Enable Fullscreen?', 'iconic-woothumbs' ),
				'subtitle' => '',
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'click_anywhere',
				'title'    => esc_html__( 'Enable Click Anywhere?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, click anywhere on the main image to trigger fullscreen.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '0',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'image_title',
				'title'    => esc_html__( 'Enable Image Title?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, the image title will be visible when viewing fullscreen.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'theme',
				'title'    => esc_html__( 'Theme', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose between the dark (default) or light theme', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => 'dark',
				'choices'  => array(
					'dark'  => esc_html__( 'Dark', 'iconic-woothumbs' ),
					'light' => esc_html__( 'Light', 'iconic-woothumbs' ),
				),
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'mobile',
		'section_id'          => 'general',
		'section_title'       => esc_html__( 'Mobile Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 0,
		'fields'              => array(
			array(
				'id'       => 'breakpoint_enable',
				'title'    => esc_html__( 'Enable Breakpoint?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'If your website is mobile, you can change the width of the slider after a certain breakpoint.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'breakpoint',
				'title'    => esc_html__( 'Breakpoint (px)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'The slider width will be affected after the breakpoint.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 768,
			),
			array(
				'id'       => 'width',
				'title'    => esc_html__( 'Width After Breakpoint (%)', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'The width of the images display after the breakpoint.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 100,
			),
			array(
				'id'       => 'position',
				'title'    => esc_html__( 'Position After Breakpoint', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose a position for the images after the breakpoint.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => 'none',
				'choices'  => array(
					'left'  => esc_html__( 'Left', 'iconic-woothumbs' ),
					'right' => esc_html__( 'Right', 'iconic-woothumbs' ),
					'none'  => esc_html__( 'None', 'iconic-woothumbs' ),
				),
			),
			array(
				'id'       => 'thumbnails_below',
				'title'    => esc_html__( 'Move Thumbnails Below After Breakpoint?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'Choose whether to move the thumbnail navigation below the main image display after the breakpoint.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
				'show_if'  => array(
					array(
						'field' => 'display_general_layout',
						'value' => array( 'slider' ),
					),
				),
			),
			array(
				'id'       => 'thumbnails_count',
				'title'    => esc_html__( 'Thumbnails Count After Breakpoint', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'The number of thumbnails to display in a row after the breakpoint.', 'iconic-woothumbs' ),
				'type'     => 'number',
				'default'  => 3,
				'show_if'  => array(
					array(
						'field' => 'display_general_layout',
						'value' => array( 'slider' ),
					),
				),
			),
		),
	);

	$wpsf_settings['sections'][] = array(
		'tab_id'              => 'performance',
		'section_id'          => 'cache',
		'section_title'       => esc_html__( 'Cache Settings', 'iconic-woothumbs' ),
		'section_description' => '',
		'section_order'       => 0,
		'fields'              => array(
			array(
				'id'       => 'enable',
				'title'    => esc_html__( 'Enable Image Cache?', 'iconic-woothumbs' ),
				'subtitle' => esc_html__( 'When enabled, image data for each product will be cached in the database to reduce the time it takes to load the gallery.', 'iconic-woothumbs' ),
				'type'     => 'select',
				'default'  => '1',
				'choices'  => array(
					'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
					'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				),
			),
		),
	);

	// Conditionals.

	if ( Iconic_WooThumbs_Core_Helpers::woo_version_compare( '3.3', '<' ) ) {
		unset(
			$wpsf_settings['sections']['images']['fields']['single_image_width'],
			$wpsf_settings['sections']['images']['fields']['single_image_crop'],
			$wpsf_settings['sections']['images']['fields']['gallery_thumbnail_image_width'],
			$wpsf_settings['sections']['images']['fields']['gallery_thumbnail_image_crop']
		);
	}

	if ( Iconic_WooThumbs_Core_Settings::is_settings_page() ) {
		$wpsf_settings['sections']['tools'] = array(
			'tab_id'              => 'dashboard',
			'section_id'          => 'tools',
			'section_title'       => esc_html__( 'Tools', 'iconic-woothumbs' ),
			'section_description' => '',
			'section_order'       => 20,
			'fields'              => array(
				// NOTE: this functionality is on hold until after
				// Freemius is removed from the plugin very soon.
				// array(
				// 	'id'       => 'remove_data_uninstall',
				// 	'title'    => esc_html__( 'Remove Data on Uninstall?', 'iconic-woothumbs' ),
				// 	'subtitle' => esc_html__( 'When enabled, WooThumbs removes all product and image meta data and plugin settings data upon uninstallation.', 'iconic-woothumbs' ),
				// 	'type'     => 'select',
				// 	'default'  => '0',
				// 	'choices'  => array(
				// 		'0' => esc_html__( 'No', 'iconic-woothumbs' ),
				// 		'1' => esc_html__( 'Yes', 'iconic-woothumbs' ),
				// 	),
				// ),
				array(
					'id'       => 'install_db',
					'title'    => esc_html__( 'Install Database Tables', 'iconic-woothumbs' ),
					'subtitle' => esc_html__( "If there's an issue with the database tables, you can run this tool to ensure they're all properly installed.", 'woothumbs' ),
					'type'     => 'custom',
					'default'  => '<button type="submit" name="iconic_woothumbs_install_db" class="button button-secondary">' . __( 'Install Tables', 'woothumbs' ) . '</button>',
				),
				array(
					'id'       => 'clear-cache',
					'title'    => esc_html__( 'Clear Image Cache', 'iconic-woothumbs' ),
					'subtitle' => esc_html__( 'Clear the image cache to refresh all product imagery.', 'iconic-woothumbs' ),
					'type'     => 'custom',
					'default'  => Iconic_WooThumbs_Settings::clear_image_cache_link(),
				),
			),

		);
	}

	return $wpsf_settings;
}
