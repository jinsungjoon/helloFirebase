/**
 * 
 */

var version    = "";
$(document).ready(function() {
	//버튼을 눌렀을 경우 구글 인증 동작
	$("#googleLogin").click(function(){
		//구글 인증을 provider 변수에 대체
		var provider = new firebase.auth.GoogleAuthProvider();
		//provider(구글 인증) 인증으로 로그인처리
		firebase.auth().signInWithPopup(provider).then(function(result) {
			  // This gives you a Google Access Token. You can use it to access the Google API.
			  var token = result.credential.accessToken;
			  // The signed-in user info.
			  var user = result.user;
			  console.log(JSON.stringify(user));
			  //구글 로그인이 성공했을 경우 수행할 코드
			  $("#auth").text(user.displayName+"님이 로그인  하셨습니다.");
			  $("#userId").val(user.email);
			  // ...
			}).catch(function(error) {
				//구글 로그인 실패시
			  // Handle Errors here.
			  var errorCode = error.code;
			  var errorMessage = error.message;
			  // The email of the user's account used.
			  var email = error.email;
			  // The firebase.auth.AuthCredential type that was used.
			  var credential = error.credential;
			  alert(errorMessage);
			  // ...
			});
	});
	//로그아웃 버튼을 눌렀을 때 인증 해제 하도록 하기
	$("#logout").click(function(){
		//DB의 변화를 더이상 감지 하지 않음
		firebase.database().ref('/onUsers/').off();
		//접속상태값 변경
		firebase.database().ref("onUsers/"+_uid+"/siteOn").set(0);
		//인증 해제
		firebase.auth().signOut().then(function() {
			  $("#userId").val('');
			  $("#auth").text("인증되지 않음");
			  alert('인증이 해제되었습니다.');
			}, function(error) {
			  alert('Sign Out Error:'+ error);
			});
	});
//	firebase.database().ref('/메세지').set("안녕하세요!");
//	firebase.database().ref('/메세지').once('value',function(snapshot){
	firebase.database().ref('/메세지').on('value',function(snapshot){
		var message = snapshot.val();
		$("#DB_MESSAGE").text(message);
	})
	$("#BTN_UPDATE").click(function(){
		var new_message = $("#INPUT_MESSAGE").val();
		var updates = {};
		updates['/메세지'] = new_message;
		firebase.database().ref().update(updates);
	});
	//인증 상태 변화 감시하기
	firebase.auth().onAuthStateChanged(function(user){
		if(user){
			_uid = user.uid;
			$("#auth").text(user.displayName+"님이 로그인  하셨습니다.");
			//디비에 접속 하면 상태변경
			firebase.database().ref('/onUsers/'+user.uid).set({"username":user.displayName,"siteOn":1});
			
			//상태가 바뀔 때를 감지할 리스너 (JS 옵저버) 장착
			firebase.database().ref('/onUsers/').on('value',function(snapshot_users){
				//유저를 하나씩 읽어오기
				$("#SITE_ON_USERS").html('');
				
				firebase.database().ref('/onUsers/').on("child_added",function(snapshot){
					if(snapshot.val().siteOn==1){
						var li_tag = '<li>'+snapshot.val().username+'</li>';
						$("#SITE_ON_USERS").append(li_tag);
					}
				});
			});
			firebase.database().ref("/onUsers/"+user.uid+"/siteOn").onDisconnect().set(0);
		}else{
			_uid = null;
			$("#auth").text(user.displayName+"인증되지 않음");
		}
	});
	$(window).on("beforeunload",function(){
		if(_uid != null){
			firebase.database().ref("/onUsers/"+_uid+"/siteOn").set(0);//상태변경
		}
	});
});
$(window).ready(function() {
	$.fn.SetAppInit();
});
$.fn.extend({	
	SetAppInit:function(){
		if(G_MOBILE_FLAG){
			version = window.userProxy.andrGetAppVersion();
			var testTmp = window.userProxy.andrGetTestServerCheck();
			$("#version").html((testTmp == '' ? '' : '<font color="red" style="font-style: italic;">(' + testTmp + ')</font>') + "Version : " + parseFloat(version).toFixed(2));
			
			// 로그인아이디 설정
//			var sessionUserId = $.fn.getSessionUserId();
//			if(sessionUserId != "") {
//				$("#userId").val(sessionUserId);
//			}
			if(testTmp != "") {
				alert("테스트서버입니다.\n관리자에게 문의하십시오.");
			}
		}
	},
	loginProc:function(){
		var userId ="",userPass="";
			userId = $("#userId").val();
			userPass = $("#userPass").val();
		if(userId == ""){
			alert("아이디를 입력하세요");
			$("#userId").focus();
			return;
		}
		if(userPass == ""){
			alert("비밀번호를 입력하세요");
			$("#userPass").focus();
			return;
		}
		var phoneNo = "";
		if(G_MOBILE_FLAG){
			phoneNo = window.userProxy.andrGetPhoneNo();
		}
		var data = {
				serviceFlag:G_SF_USER_LOGIN,
				callback:"abcd",
				userId:userId,
				passwd:userPass,
				version:version,
				phoneNo:phoneNo
		};
		
		$.ajax({
			global: false,
			timeout : 30000,
			type : "POST",
			url : G_JSONP_URL_USER,
			data : data,
			dataType : "jsonp",
			jsonp : "callback",
			crossDomain : true,
			success : function(data){
//				alert(JSON.stringify(data));
				//로그인 성공
				if(data.RETURN_CODE=="200"){
//					if(G_MOBILE_FLAG)$.fn.doLoginSuccess(data.RES_LDATA);
////					else location.href = '../delivery/list.jsp';
//					else $.fn.goMenuList("일별 장애접수 현황 조회");
					
					// 모바일 구분 없이 페이지 이동.
					$.fn.goMenuList("분석","일별 장애접수 현황 조회");
				}
				//로그인 실패
				else{
					alert(data.RETURN_MSG);
				}
			},
			error: function(request,status,error) {
				alert(error);
			}
		});
	},
	
	//login callback
	doLoginSuccess : function (RES_LDATA) {
		G_LOGIN_USERID = $("#userId").val().trim();
		
		// 버전체크
		if($.fn.VersionCheck(RES_LDATA) == true) 
			return;
		
		// 로그인 정보를 JSON형식 데이터로 변경 / 저장
		$.fn.LoginDataDivision(RES_LDATA, "false");
		
		// 비밀번호 체크
		if($.fn.PasswordCheck(RES_LDATA) == true)
			return;
		
		// 해쉬 데이터 초기화
		window.sharedProxy.andrHashClearAllContent();
		
		window.sharedProxy.andrSPAddItem(G_LOGIN_USERID, "S_CHECK_FLAG"  , "true");

		// PUSH ID 처리
		console.log("PUSH처리 해야 한다...");
		//$.fn.regPushId();
		
		$.fn.doSessionLogin(G_LOGIN_USERID);
	},
	
	//스마트폰 버전체크
	VersionCheck : function(RES_LDATA) {
		var version = window.userProxy.andrGetAppVersion();
		if (RES_LDATA.CURR_VERSION != version && RES_LDATA.CURR_VERSION != "00.00") {
			$.fn.doSessionAutoSyncInit(G_LOGIN_USERID);
			
			alert("신규프로그램이 업데이트 되었습니다.\n현재버전 : " + version + "\n신규버전 : " + RES_LDATA.CURR_VERSION, 0);
			window.nativeProxy.andrAppUpgrade("");
			return true;
		}
		
		return false;
	},
	
	
	//로그인 정보저장
	LoginDataDivision : function(data, checkFlag) {
		// 대소문자때문에 서버에서 받은 값으로 변경한다.
		G_LOGIN_USERID = data.USER_ID;
		
		var divData = {
				USER_ID           : data.USER_ID,
				USER_NM           : data.USER_NAME,
				ROLE_CODE         : data.ROLE_CODE,
				SYS_GUBUN         : data.SYS_GUBUN,
				DEPT_CODE         : data.DEPT_CODE,
				DEPT_NAME         : data.DEPT_NAME,
				VALIDATION_KEY    : data.VALIDATION_KEY,
				CURR_VERSION      : data.CURR_VERSION,
				PASSWD_EXP_DAYS   : data.PASSWD_EXP_DAYS,
				SERVER_DATE       : data.SERVER_DATE
		}
		divData = '{"'+G_LOGIN_USERID+'":[' + JSON.stringify(divData) + ']}';
		
		// 로그인 정보를 로컬에 저장
		window.sharedProxy.andrSPAddContent(G_LOGIN_USERID, divData);
	},
	
	//비밀번호 체크
	PasswordCheck : function(RES_LDATA) {
		if (Number(RES_LDATA.PASSWD_EXP_DAYS) < 0) {
			
			var msgBox = new MsgBox("비밀번호가 만료하였습니다.<br>(" + (0-RES_LDATA.PASSWD_EXP_DAYS).toString() + "일경과).<br>비밀번호를 변경 후 사용하십시오.");
			msgBox.title("확인");
			msgBox.button1("이전", function(result) {});
			msgBox.button2("변경", function(result) {
				window.sharedProxy.andrHashAddItem(H_LIST_TO_DETAIL,0,"userCode", RES_LDATA.USER_ID);
				window.sharedProxy.andrHashAddItem(H_LIST_TO_DETAIL,0,"userName", RES_LDATA.USER_NAME);
				
				$.fn.showChildView("mnu_inb213");
				$("#passWd").val('');
			});
			msgBox.confirm();
			return true;
		}
		
		return false;
	},
});


