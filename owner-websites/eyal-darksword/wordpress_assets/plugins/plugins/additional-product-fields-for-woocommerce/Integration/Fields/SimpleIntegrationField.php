<?php


namespace rednaowooextraproduct\Integration\Fields;


class SimpleIntegrationField extends IntegrationFieldBase
{


    public function ToText()
    {
        return $this->Entry->Value;
    }
}