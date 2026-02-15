<?php

namespace WPDesk\ActivationReminder\Composer;

class InvalidSettingValue extends \RuntimeException {

	public function __construct( $field, $value ) {
		$message = sprintf( 'Invalid Activation Reminder setting value for field %1$s: %2$s!', $field, isset( $value ) ? $value : ' not set' );
		parent::__construct( $message );
	}

}