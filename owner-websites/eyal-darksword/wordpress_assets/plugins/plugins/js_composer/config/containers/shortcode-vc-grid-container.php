<?php
/**
 * Configuration file for [vc_grid_container] shortcode of 'Grid Container' element.
 *
 * @see https://kb.wpbakery.com/docs/inner-api/vc_map/ for more detailed information about element attributes.
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( '-1' );
}

return [
	'name' => esc_html__( 'Grid container', 'js_composer' ),
	'is_container' => true,
	'icon' => 'icon-wpb-grid-container',
	'show_settings_on_create' => false,
	'category' => esc_html__( 'Content', 'js_composer' ),
	'class' => 'vc_main-sortable-element',
	'description' => esc_html__( 'Build layout using CSS grid containers', 'js_composer' ),
	'as_child' => [ 'except' => 'vc_column,vc_grid_container_item,vc_row_inner,vc_column_inner,vc_flexbox_container_item' ],
	'as_parent' => [ 'only' => 'vc_grid_container_item' ],
	'params' => [
		[
			'type' => 'textfield',
			'heading' => esc_html__( 'Grid Container Title', 'js_composer' ),
			'param_name' => 'grid_container_title',
			'description' => esc_html__( 'This title is visible only in the admin area and helps site editors differentiate rows.', 'js_composer' ),
		],
		[
			'type' => 'range',
			'heading' => esc_html__( 'Columns', 'js_composer' ),
			'param_name' => 'columns',
			'value' => '2',
			'min' => '1',
			'max' => '12',
			'description' => esc_html__( 'Enter the number of columns for the grid.', 'js_composer' ),
			'placeholder' => esc_html__( 'e.g. 3', 'js_composer' ),
		],
		[
			'type' => 'range',
			'heading' => esc_html__( 'Rows', 'js_composer' ),
			'param_name' => 'rows',
			'value' => '1',
			'min' => '1',
			'max' => '12',
			'description' => esc_html__( 'Enter the number of rows for the grid.', 'js_composer' ),
			'placeholder' => esc_html__( 'e.g. 3', 'js_composer' ),
		],
		[
			'type' => 'textfield',
			'heading' => esc_html__( 'Row gap', 'js_composer' ),
			'param_name' => 'row_gap',
			'value' => '',
			'placeholder' => '5px',
			'description' => esc_html__( 'Select gap between grid rows.', 'js_composer' ),
		],
		[
			'type' => 'textfield',
			'heading' => esc_html__( 'Columns gap', 'js_composer' ),
			'param_name' => 'col_gap',
			'value' => '',
			'placeholder' => '5px',
			'description' => esc_html__( 'Select gap between grid columns.', 'js_composer' ),
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
	'js_view' => 'VcGridContainerView',
];
