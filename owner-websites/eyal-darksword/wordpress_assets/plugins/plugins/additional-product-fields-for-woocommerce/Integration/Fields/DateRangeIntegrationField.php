<?php


namespace rednaowooextraproduct\Integration\Fields;


class DateRangeIntegrationField extends IntegrationFieldBase
{
    public function ToText()
    {
        return $this->Entry->Value->StartValue.' - '.$this->Entry->Value->EndValue;
    }
}