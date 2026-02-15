<?php


namespace rednaowooextraproduct\Integration\Fields;


abstract class IntegrationFieldBase
{
    public $Order;
    public $LineItem;
    public $Entry;
    public function __construct($order,$lineItem,$entryData)
    {
        $this->Order=$order;
        $this->LineItem=$lineItem;
        $this->Entry=$entryData;

    }


    public function GetLabel(){
        if(isset( $this->Entry->Label))
            return $this->Entry->Label;
        else return '';
    }


    public function GetFieldName(){
        if(isset( $this->Entry->FieldName))
            return $this->Entry->FieldName;
        else return '';
    }

    public abstract function ToText();

    public function ToHTML(){
        return '<span>'.\esc_html($this->ToText()).'</span>';
    }

    public function __toString()
    {
        return $this->ToText();
    }
}