<?php
/**
 * Shortcode output template for a [wpb-front-editor-control-start]
 *
 * @var array $atts
 */

?>
<div
	<?php echo isset( $atts['class'] ) ? ' class="' . esc_attr( $atts['class'] ) . '"' : ''; ?>
	<?php echo isset( $atts['data-tag'] ) ? ' data-tag="' . esc_attr( $atts['data-tag'] ) . '"' : ''; ?>
	<?php echo isset( $atts['data-shortcode-controls'] ) ? ' data-shortcode-controls="' . esc_attr( wp_json_encode( explode( ',', $atts['data-shortcode-controls'] ) ) ) . '"' : ''; ?>
	<?php echo isset( $atts['data-model-id'] ) ? ' data-model-id="' . esc_attr( $atts['data-model-id'] ) . '"' : ''; ?>
	<?php echo isset( $atts['data-container'] ) && $atts['data-container'] ? ' data-container="' . esc_attr( $atts['data-container'] ) . '"' : ''; ?>
>
