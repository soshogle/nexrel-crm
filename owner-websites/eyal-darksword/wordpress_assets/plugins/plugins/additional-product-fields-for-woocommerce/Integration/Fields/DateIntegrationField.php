<?php


namespace rednaowooextraproduct\Integration\Fields;


class DateIntegrationField extends IntegrationFieldBase
{

    public function ToText()
    {
        return $this->Entry->Value;
    }
}