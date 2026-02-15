<?php


namespace rednaowooextraproduct\Integration\Fields;


use Exception;

class CheckIntegrationField extends IntegrationFieldBase
{

    public function ToText()
    {
        $value=$this->Entry->Value;
        if($value)
            return 'True';
        else
            return 'False';
    }
}