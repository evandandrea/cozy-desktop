port module Main exposing (..)

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Dict exposing (Dict)
import Json.Decode as Json
import Time exposing (Time)
import Helpers exposing (Locale)
import Model exposing (Status(..))
import Help
import Icons
import Wizard
import Address
import Folder
import Dashboard
import Settings
import Unlinked
import Revoked
import StatusBar


main =
    Html.programWithFlags
        { init = init
        , update = update
        , view = view
        , subscriptions = subscriptions
        }



-- MODEL
-- type Tab
--     = DashboardPage
--     | SettingsPage


type Page
    = WizardPage
    | DashboardPage
    | SettingsPage
    | UnlinkedPage
    | RevokedPage
    | HelpPage


type alias Model =
    { localeIdentifier : String
    , locales : Dict String Locale
    , page : Page
    , wizard : Wizard.Model
    , dashboard : Dashboard.Model
    , settings : Settings.Model
    , revoked : Revoked.Model
    , status : Status
    , help : Help.Model
    }


type alias Flags =
    { page : String
    , folder : String
    , locale : String
    , locales : Json.Value
    , platform : String
    , version : String
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    let
        localeIdentifier =
            flags.locale

        locales =
            case
                Json.decodeValue (Json.dict (Json.dict Json.string)) flags.locales
            of
                Ok value ->
                    value

                Err _ ->
                    Dict.empty

        page =
            case flags.page of
                "onboarding" ->
                    WizardPage

                "help" ->
                    HelpPage

                "dashboard" ->
                    DashboardPage

                "settings" ->
                    SettingsPage

                -- Temporarily use the MsgMechanism to
                -- get to the 2Panes page.
                _ ->
                    WizardPage

        wizard =
            Wizard.init flags.folder flags.platform

        dashboard =
            Dashboard.init

        settings =
            Settings.init flags.version

        status =
            Starting

        revoked =
            Revoked.init

        help =
            Help.init

        model =
            Model localeIdentifier locales page wizard dashboard settings revoked status help
    in
        ( model, Cmd.none )



-- UPDATE


type Msg
    = NoOp
    | WizardMsg Wizard.Msg
    | SyncStart ( String, String )
    | Updated
    | StartSyncing Int
    | StartBuffering
    | StartSquashPrepMerging
    | GoOffline
    | SetError String
    | DashboardMsg Dashboard.Msg
    | SettingsMsg Settings.Msg
    | GoToCozy
    | GoToFolder
    | GoToTab Page
    | GoToStrTab String
    | Unlink
    | Revoked
    | RevokedMsg Revoked.Msg
    | Restart
    | HelpMsg Help.Msg


port restart : Bool -> Cmd msg


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        WizardMsg subMsg ->
            let
                ( wizard_, cmd ) =
                    Wizard.update subMsg model.wizard
            in
                ( { model | wizard = wizard_ }, Cmd.map WizardMsg cmd )

        SyncStart info ->
            let
                ( settings, _ ) =
                    Settings.update (Settings.FillAddressAndDevice info) model.settings
            in
                ( { model | page = (DashboardPage), settings = settings }, Cmd.none )

        Updated ->
            ( { model | status = UpToDate }, Cmd.none )

        StartSyncing n ->
            ( { model | status = Syncing n }, Cmd.none )

        StartBuffering ->
            ( { model | status = Buffering }, Cmd.none )

        StartSquashPrepMerging ->
            ( { model | status = SquashPrepMerging }, Cmd.none )

        GoOffline ->
            ( { model | status = Offline }, Cmd.none )

        SetError error ->
            ( { model | status = Error error }, Cmd.none )

        GoToCozy ->
            ( model, gotocozy () )

        GoToFolder ->
            ( model, gotofolder () )

        GoToTab tab ->
            let
                dashboard =
                    Dashboard.update Dashboard.Reset model.dashboard
            in
                ( { model | page = (tab), dashboard = dashboard }, Cmd.none )

        GoToStrTab tabstr ->
            case
                tabstr
            of
                "settings" ->
                    update (GoToTab SettingsPage) model

                _ ->
                    update (GoToTab DashboardPage) model

        DashboardMsg subMsg ->
            let
                dashboard =
                    Dashboard.update subMsg model.dashboard
            in
                ( { model | dashboard = dashboard }, Cmd.none )

        SettingsMsg subMsg ->
            let
                ( settings, cmd ) =
                    Settings.update subMsg model.settings
            in
                ( { model | settings = settings }, Cmd.map SettingsMsg cmd )

        Unlink ->
            ( { model | page = UnlinkedPage }, Cmd.none )

        Revoked ->
            ( { model | page = RevokedPage }, Cmd.none )

        Restart ->
            ( model, restart True )

        RevokedMsg subMsg ->
            let
                ( revoked, cmd ) =
                    Revoked.update subMsg model.revoked
            in
                ( { model | revoked = revoked }, Cmd.map RevokedMsg cmd )

        NoOp ->
            ( model, Cmd.none )

        HelpMsg subMsg ->
            let
                ( help, cmd ) =
                    Help.update subMsg model.help
            in
                ( { model | help = help }, Cmd.map HelpMsg cmd )



-- SUBSCRIPTIONS


port registrationError : (String -> msg) -> Sub msg


port registrationDone : (Bool -> msg) -> Sub msg


port folderError : (String -> msg) -> Sub msg


port folder : (String -> msg) -> Sub msg


port synchonization : (( String, String ) -> msg) -> Sub msg


port newRelease : (( String, String ) -> msg) -> Sub msg


port gototab : (String -> msg) -> Sub msg


port gotocozy : () -> Cmd msg


port gotofolder : () -> Cmd msg


port offline : (Bool -> msg) -> Sub msg


port updated : (Bool -> msg) -> Sub msg


port syncing : (Int -> msg) -> Sub msg


port squashPrepMerge : (Bool -> msg) -> Sub msg


port buffering : (Bool -> msg) -> Sub msg


port transfer : (Dashboard.File -> msg) -> Sub msg


port remove : (Dashboard.File -> msg) -> Sub msg


port diskSpace : (Settings.DiskSpace -> msg) -> Sub msg


port syncError : (String -> msg) -> Sub msg


port autolaunch : (Bool -> msg) -> Sub msg


port mail : (Maybe String -> msg) -> Sub msg



-- https://github.com/elm-lang/elm-compiler/issues/1367


port cancelUnlink : (Bool -> msg) -> Sub msg


port unlink : (Bool -> msg) -> Sub msg


port revoked : (Bool -> msg) -> Sub msg


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ registrationError (WizardMsg << Wizard.AddressMsg << Address.RegistrationError)
        , registrationDone (always (WizardMsg Wizard.RegistrationDone))
        , folderError (WizardMsg << Wizard.FolderMsg << Folder.SetError)
        , folder (WizardMsg << Wizard.FolderMsg << Folder.FillFolder)
        , synchonization SyncStart
        , newRelease (SettingsMsg << Settings.NewRelease)
        , gototab (GoToStrTab)
        , Time.every Time.second (DashboardMsg << Dashboard.Tick)
        , transfer (DashboardMsg << Dashboard.Transfer)
        , remove (DashboardMsg << Dashboard.Remove)
        , diskSpace (SettingsMsg << Settings.UpdateDiskSpace)
        , syncError (SetError)
        , offline (always GoOffline)
        , buffering (always StartBuffering)
        , squashPrepMerge (always StartSquashPrepMerging)
        , updated (always Updated)
        , syncing StartSyncing
        , mail (HelpMsg << Help.MailSent)
        , autolaunch (SettingsMsg << Settings.AutoLaunchSet)
        , cancelUnlink (always (SettingsMsg Settings.CancelUnlink))
        , unlink (always Unlink)
        , revoked (always Revoked)
        ]



-- VIEW


menu_item helpers model title page =
    div
        [ classList
            [ ( "two-panes__menu__item", True )
            , ( "two-panes__menu__item--active", model.page == page )
            ]
        , onClick (GoToTab page)
        ]
        [ text (helpers.t ("TwoPanes " ++ title))
        ]


view : Model -> Html Msg
view model =
    let
        locale =
            case
                Dict.get model.localeIdentifier model.locales
            of
                Nothing ->
                    Dict.empty

                Just value ->
                    value

        helpers =
            Helpers.forLocale locale
    in
        case
            model.page
        of
            WizardPage ->
                Html.map WizardMsg (Wizard.view helpers model.wizard)

            UnlinkedPage ->
                Html.map (\_ -> Restart) (Unlinked.view helpers)

            RevokedPage ->
                Html.map RevokedMsg (Revoked.view helpers model.revoked)

            HelpPage ->
                Html.map HelpMsg (Help.view helpers model.help)

            _ ->
                div
                    [ class "container" ]
                    [ (StatusBar.view helpers model.status)
                    , section [ class "two-panes" ]
                        [ aside [ class "two-panes__menu" ]
                            [ menu_item helpers model "Recents" DashboardPage
                            , menu_item helpers model "Settings" SettingsPage
                            ]
                        , if model.page == DashboardPage then
                            Html.map DashboardMsg (Dashboard.view helpers model.dashboard)
                          else if model.page == SettingsPage then
                            Html.map SettingsMsg (Settings.view helpers model.settings)
                          else
                            div [] []
                        ]
                    , div [ class "bottom-bar" ]
                        [ a
                            [ href "#"
                            , onClick GoToFolder
                            ]
                            [ Icons.folder 48 False
                            , text (helpers.t "Bar GoToFolder")
                            ]
                        , a
                            [ href "#"
                            , onClick GoToCozy
                            ]
                            [ Icons.globe 48 False
                            , text (helpers.t "Bar GoToCozy")
                            ]
                        ]
                    ]
