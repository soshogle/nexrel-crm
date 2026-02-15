<?php
/**
 * The template for displaying [vc_grid_container] shortcode output of 'Grid Container' element.
 *
 * This template can be overridden by copying it to yourtheme/vc_templates/vc_grid_container.php.
 *
 * @see https://kb.wpbakery.com/docs/developers-how-tos/change-shortcodes-html-output
 *
 * @var array $atts
 * @var string $content - shortcode content
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( '-1' );
}
?>

<div <?php $this->output_wrapper_attributes( $atts ); ?>>
	<?php echo wpb_js_remove_wpautop( $content, true ); //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
