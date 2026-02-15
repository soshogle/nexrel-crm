<?php
/**
 * Class Item
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use Psr\Log\LoggerInterface;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use FSVendor\WPDesk\Forms\Field;

/**
 * Item condition.
 */
class Item extends AbstractCondition {

	use ConditionOperators;

	const CONDITION_ID = 'item';

	const MIN = 'min';
	const MAX = 'max';

	/**
	 * Item constructor.
	 *
	 * @param int $priority .
	 */
	public function __construct( $priority = 10 ) {
		$this->condition_id = self::CONDITION_ID;
		$this->name         = __( 'Item', 'flexible-shipping-pro' );
		$this->description  = __( 'Shipping cost based on the products\' in the cart quantity', 'flexible-shipping-pro' );
		$this->group        = __( 'Cart', 'flexible-shipping-pro' );
		$this->priority     = $priority;
	}

	/**
	 * @param array            $condition_settings .
	 * @param ShippingContents $contents           .
	 * @param LoggerInterface  $logger             .
	 *
	 * @return bool
	 */
	public function is_condition_matched( array $condition_settings, ShippingContents $contents, LoggerInterface $logger ) {
		$min = (float) ( isset( $condition_settings[ self::MIN ] ) && 0 !== strlen( $condition_settings[ self::MIN ] ) ? $condition_settings[ self::MIN ] : 0 );
		$max = (float) ( isset( $condition_settings[ self::MAX ] ) && 0 !== strlen( $condition_settings[ self::MAX ] ) ? $condition_settings[ self::MAX ] : INF );

		/**
		 * Can modify contents item count passed to Item condition.
		 *
		 * @param int $items_count Items count.
		 *
		 * @since 2.3
		 */
		$items_count = (int) apply_filters( 'flexible-shipping/condition/contents_items_count', $contents->get_contents_items_count() );

		$condition_matched = $items_count >= $min && $items_count <= $max;

		$condition_matched = $this->apply_is_not_operator( $condition_matched, $this->get_operator_from_settings( $condition_settings ) );

		$logger->debug( $this->format_for_log( $condition_settings, $condition_matched, $items_count ) );

		return $condition_matched;
	}


	/**
	 * @return Field[]
	 */
	public function get_fields() {
		return array(
			$this->prepare_operator_is(),
			( new Field\InputNumberField() )
				->set_name( self::MIN )
				->add_class( 'wc_input_decimal' )
				->add_class( 'hs-beacon-search' )
				->add_class( 'parameter_min' )
				->add_data( 'beacon_search', __( 'items is from', 'flexible-shipping-pro' ) )
				->set_placeholder( __( 'min', 'flexible-shipping-pro' ) )
				->set_label( __( 'from', 'flexible-shipping-pro' ) ),
			( new Field\InputNumberField() )
				->set_name( self::MAX )
				->add_class( 'wc_input_decimal' )
				->add_class( 'hs-beacon-search' )
				->add_class( 'parameter_max' )
				->add_data( 'beacon_search', __( 'items to', 'flexible-shipping-pro' ) )
				->set_placeholder( __( 'max', 'flexible-shipping-pro' ) )
				->set_label( __( 'to', 'flexible-shipping-pro' ) )
				->add_data( 'suffix', __( 'qty', 'flexible-shipping-pro' ) ),
		);
	}
}
