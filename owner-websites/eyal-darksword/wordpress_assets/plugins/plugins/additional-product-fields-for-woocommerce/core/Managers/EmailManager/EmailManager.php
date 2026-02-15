<?php


namespace rednaowooextraproduct\core\Managers\EmailManager;


use Exception;
use rednaowooextraproduct\core\Managers\ConditionManager\ConditionManager;
use rednaowooextraproduct\core\Managers\FormManager\FormBuilder;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\SlateGenerator;

class EmailManager
{
    /** @var SlateGenerator */
    public $SlateGenerator;
    /** @var FormBuilder */
    public $Model;
    public $Email;

    /**
     * @param $model FormBuilder
     * @param $email
     */
    public function Initialize($model,$email){
        $this->Model=$model;
        $this->Email=$email;

        $this->SlateGenerator=new SlateGenerator($model,$email->Content);

    }


    public function Send()
    {
        if(!$this->ShouldEmailBeSend())
            return true;


        $subject=$this->GetSubject();
        $toEmailAddress=$this->ProcessEmails($this->Email->To);
        $bcc=$this->ProcessEmails($this->Email->BCC);
        $cc=$this->ProcessEmails($this->Email->CC);
        $replyTo=$this->ProcessEmails($this->Email->ReplyTo);
        $from=$this->GetFromName();


        $content=$this->SlateGenerator->GetHtml();


        $headers=array(
            'From: '.$from,
            'Content-Type: text/html; charset=UTF-8'
        );

        if($cc!='')
            $headers[]='CC:'.$cc;

        if($bcc!='')
            $headers[]='BCC:'.$bcc;

        if($replyTo!='')
            $headers[]='Reply-To:'.$replyTo;

        if($toEmailAddress=='')
        {
            $this->Error='The email can\'t be send to any of the selected email addresses';
            return false;
        }

        return wp_mail($toEmailAddress,$subject,$content,$headers);

    }


    private function ProcessEmails($emailAddresses)
    {
        $emails=[];
        foreach($emailAddresses as $currentEmail)
        {
            if($currentEmail->Type=='Field')
            {
                $emailToAdd=$this->GetEmailFromField($currentEmail->Value);
                if($emailToAdd!='')
                    $emails[]=$emailToAdd;
            }else{
                $emails[]=$currentEmail->Value;
            }
        }
        return \implode(',',$emails);
    }

    private function GetEmailFromField($Value)
    {
        $field=$this->Model->ContainerManager->GetFieldById($Value);
        if($field==null)
            return '';

        $value=trim($field->GetText());
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            return '';
        }

        return $value;

    }

    private function GetFromName()
    {

        $fromName=$this->Email->FromName;
        if($fromName=='')
        {
            $fromName=get_bloginfo('name');
        }

        $rule = array("\r" => '',
            "\n" => '',
            "\t" => '',
            '"'  => "'",
            '<'  => '[',
            '>'  => ']',
        );

        $fromName= trim(strtr($fromName, $rule));


        $sitename = strtolower( $_SERVER['SERVER_NAME'] );
        if ( substr( $sitename, 0, 4 ) == 'www.' ) {
            $sitename = substr( $sitename, 4 );
        }


        $FromEmail = apply_filters('wp_mail_from', get_bloginfo('admin_email'));


        return $fromName." <$FromEmail>";


    }

    public function GetSubject(){
        return $this->Email->Subject;
    }

    public function ShouldEmailBeSend()
    {
        $condition=new ConditionManager();
        return $condition->ShouldProcess($this->Model,$this->Email->Condition);
    }


}