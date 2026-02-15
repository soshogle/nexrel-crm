<?php
/**
 * Configuration file for [vc_flexbox_container] shortcode of 'Flex Container' element.
 *
 * @see https://kb.wpbakery.com/docs/inner-api/vc_map/ for more detailed information about element attributes.
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( '-1' );
}

return [
	'name' => esc_html__( 'Flexbox container', 'js_composer' ),
	'is_container' => true,
	'icon' => 'icon-wpb-flexbox-container',
	'show_settings_on_create' => false,
	'category' => esc_html__( 'Content', 'js_composer' ),
	'class' => 'vc_main-sortable-element',
	'description' => esc_html__( 'Build layout using flexbox containers', 'js_composer' ),
	'as_child' => [ 'except' => 'vc_column,vc_flexbox_container_item,vc_row_inner,vc_column_inner,vc_grid_container_item' ],
	'as_parent' => [ 'only' => 'vc_flexbox_container_item' ],
	'params' => [
		[
			'type' => 'textfield',
			'heading' => esc_html__( 'Flexbox Container Title', 'js_composer' ),
			'param_name' => 'flexbox_container_title',
			'description' => esc_html__( 'This title is visible only in the admin area and helps site editors differentiate rows.', 'js_composer' ),
		],
		[
			'type' => 'textfield',
			'heading' => esc_html__( 'Gap', 'js_composer' ),
			'param_name' => 'gap',
			'value' => '0px',
			'placeholder' => 'e.g. 5px',
			'description' => esc_html__( 'Select gap between flex items.', 'js_composer' ),
		],
		vc_map_add_css_animation( false ),
		[
			'type' => 'el_id',
			'heading' => esc_html__( 'Element ID', 'js_composer' ),
			'param_name' => 'el_id',
			'description' => sprintf( esc_html__( 'Enter element ID (Note: make sure it is unique and valid according to %1$sw3c specification%2$s).', 'js_composer' ), '<a href="https://www.w3schools.com/tags/att_global_id.asp" target="_blank">', '</a>' ),
		],
		[
			'type' => 'textfield',
			'heading' => esc_html__( 'Extra class name', 'js_composer' ),
			'param_name' => 'el_class',
			'description' => esc_html__( 'Style particular content element differently - add a class name and refer to it in custom CSS.', 'js_composer' ),
		],
		[
			'type' => 'css_editor',
			'heading' => esc_html__( 'CSS box', 'js_composer' ),
			'param_name' => 'css',
			'group' => esc_html__( 'Design Options', 'js_composer' ),
		],
	],
	'js_view' => 'VcFlexboxContainerView',
];
