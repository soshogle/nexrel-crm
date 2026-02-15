<?php
/**
 * Bulk edit page filter by parent ID form
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

?>

<form method="get" accept-charset="utf-8" style="margin-bottom: 20px;">

	<?php $iconic_woothumbs_class->output_bulk_parameters( array( 'parent', 'paged' ) ); ?>

	<label for=""><?php esc_html_e( 'Filter by parent product ID:', 'iconic-woothumbs' ); ?></label>

	<input type="number" value="<?php echo isset( $_GET['parent'] ) ? esc_attr( $_GET['parent'] ) : ''; ?>" name="parent" class="small-text">

	<input type="submit" value="<?php esc_attr_e( 'Filter', 'iconic-woothumbs' ); ?>" class="button button-secondary">

</form>
