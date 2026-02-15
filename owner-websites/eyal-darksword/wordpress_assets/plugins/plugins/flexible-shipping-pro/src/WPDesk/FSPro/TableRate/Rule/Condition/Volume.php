<?php
/**
 * Class Volume
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use Psr\Log\LoggerInterface;
use WC_Product;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use FSVendor\WPDesk\Forms\Field;
use WPDesk\FSPro\TableRate\VolumeCalculation;

/**
 * Volume condition.
 */
class Volume extends AbstractCondition {

	use ConditionOperators;
	use VolumeCalculation;

	/** @var string */
	const CONDITION_ID = 'volume';

	const MIN = 'min';
	const MAX = 'max';

	/**
	 * Volume constructor.
	 *
	 * @param int $priority .
	 */
	public function __construct( $priority = 10 ) {
		$this->condition_id = self::CONDITION_ID;
		$this->name         = __( 'Volume', 'flexible-shipping-pro' );
		$this->description  = __( 'Shipping cost based on the volume of the products', 'flexible-shipping-pro' );
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
		$min = (float) ( isset( $condition_settings[ self::MIN ] ) && 0 !== strlen( $condition_settings[ self::MIN ] ) ? $condition_settings[ self::MIN ] : 0 );
		$max = (float) ( isset( $condition_settings[ self::MAX ] ) && 0 !== strlen( $condition_settings[ self::MAX ] ) ? $condition_settings[ self::MAX ] : INF );

		/**
		 * Can modify contents volume passed to Volume condition.
		 *
		 * @param float $contents_volume Contents volume.
		 *
		 * @since 2.3
		 */
		$contents_volume = (float) apply_filters( 'flexible-shipping/condition/contents_volume', $this->get_contents_volume( $contents ) );

		$condition_matched = $contents_volume >= $min && $contents_volume <= $max;

		$condition_matched = $this->apply_is_not_operator( $condition_matched, $this->get_operator_from_settings( $condition_settings ) );

		$logger->debug( $this->format_for_log( $condition_settings, $condition_matched, $contents_volume ) );

		return $condition_matched;
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
				->set_attribute( 'min', 0 )
				->set_placeholder( __( 'min', 'flexible-shipping-pro' ) )
				->set_label( __( 'from', 'flexible-shipping-pro' ) ),
			( new Field\InputNumberField() )
				->set_name( self::MAX )
				->add_class( 'wc_input_decimal' )
				->add_class( 'parameter_max' )
				->set_attribute( 'min', 0 )
				->set_placeholder( __( 'max', 'flexible-shipping-pro' ) )
				->set_label( __( 'to', 'flexible-shipping-pro' ) )
				->add_data( 'suffix', get_option( 'woocommerce_dimension_unit' ) . '³' ),
		];
	}
}
