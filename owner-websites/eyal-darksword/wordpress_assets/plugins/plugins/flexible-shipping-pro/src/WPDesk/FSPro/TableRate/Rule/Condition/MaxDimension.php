<?php
/**
 * Class MaxDimension
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use Psr\Log\LoggerInterface;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use FSVendor\WPDesk\Forms\Field;
use WPDesk\FSPro\TableRate\Rule\Condition\MaxDimension\MaxDimensionContentsFilter;
use WPDesk\FSPro\TableRate\Rule\Condition\MaxDimension\MaxDimensionTrait;

/**
 * Max Dimension condition.
 */
class MaxDimension extends AbstractCondition {

	use ConditionOperators;
	use MaxDimensionTrait;

	/** @var string */
	const CONDITION_ID = 'max_dimension';

	const MIN = 'min';
	const MAX = 'max';

	/**
	 * MaxDimension constructor.
	 *
	 * @param int $priority .
	 */
	public function __construct( $priority = 10 ) {
		$this->condition_id = self::CONDITION_ID;
		$this->name         = __( 'Max dimension', 'flexible-shipping-pro' );
		$this->description  = __( 'Shipping cost based on the product\'s maximum dimension', 'flexible-shipping-pro' );
		$this->group        = __( 'Product', 'flexible-shipping-pro' );
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

		$condition_matched = 0 !== count( $contents->get_contents() );

		$condition_matched = $this->apply_is_not_operator( $condition_matched, $this->get_operator_from_settings( $condition_settings ) );

		if ( $condition_matched ) {
			$input_data = $this->format_input_data_for_logger( $contents->get_contents() );
		} else {
			$input_data = $this->format_input_data_for_logger( $contents->get_non_filtered_contents() );
		}

		$logger->debug( $this->format_for_log( $condition_settings, $condition_matched, $input_data ) );

		return $condition_matched;
	}

	/**
	 * @param array $contents .
	 *
	 * @return string
	 */
	private function format_input_data_for_logger( array $contents ) {
		$dimensions = [];

		foreach ( $contents as $item ) {
			$dimensions[] = sprintf( '%1$d (%2$s)', $this->get_product_max_dimension( $item['data'] ), $item['data']->get_name() );
		}

		return implode( ', ', $dimensions );
	}

	/**
	 * @return Field[]
	 */
	public function get_fields() {
		return [
			$this->prepare_operator_is(),
			( new Field\InputNumberField() )
				->set_name( self::MIN )
				->add_class( 'wc_input_decimal' )
				->add_class( 'parameter_min' )
				->set_placeholder( __( 'is from', 'flexible-shipping-pro' ) )
				->set_label( __( 'from', 'flexible-shipping-pro' ) )
				->set_attribute( 'min', 0 ),
			( new Field\InputNumberField() )
				->set_name( self::MAX )
				->add_class( 'wc_input_decimal' )
				->add_class( 'parameter_max' )
				->set_placeholder( __( 'to', 'flexible-shipping-pro' ) )
				->set_label( __( 'to', 'flexible-shipping-pro' ) )
				->set_attribute( 'min', 0 )
				->add_data( 'suffix', get_option( 'woocommerce_dimension_unit' ) ),
		];
	}

	/**
	 * @param ShippingContents $shipping_contents  .
	 * @param array            $condition_settings .
	 *
	 * @return ShippingContents
	 */
	public function process_shipping_contents( ShippingContents $shipping_contents, array $condition_settings ) {
		$min = (float) ( isset( $condition_settings[ self::MIN ] ) && 0 !== strlen( $condition_settings[ self::MIN ] ) ? $condition_settings[ self::MIN ] : 0 );
		$max = (float) ( isset( $condition_settings[ self::MAX ] ) && 0 !== strlen( $condition_settings[ self::MAX ] ) ? $condition_settings[ self::MAX ] : INF );

		$shipping_contents->filter_contents( new MaxDimensionContentsFilter( $min, $max ) );

		return $shipping_contents;
	}
}
