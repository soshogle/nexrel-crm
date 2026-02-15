<?php


namespace rednaowooextraproduct\core\Managers\EmailManager;


use rednaowooextraproduct\core\Managers\FormManager\FormBuilder;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\SlateGenerator;

class TestEmailManager extends EmailManager
{


    public function Initialize($model, $email)
    {
        parent::Initialize($model, $email);
        $this->SlateGenerator->SetIsTest();
    }

    public function ShouldEmailBeSend()
    {
        return true;
    }


}