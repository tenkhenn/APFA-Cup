#!/usr/bin/env python3
"""
APFA INT GOLD CUP 2026 Tournament API Test Suite
Tests all backend endpoints according to the review request specifications.
"""

import requests
import json
import sys
from typing import Dict, List, Any, Optional

# Base URL as specified in review request
BASE_URL = "https://735de361-b07b-4946-a3bd-b3dbf0fa1199.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "goldcup2026"

class TournamentAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def test_auth_wrong_credentials(self) -> bool:
        """Test 1: POST /api/auth/login with WRONG creds → expect 401 with {error:"Invalid credentials"}"""
        try:
            self.log("Testing authentication with wrong credentials...")
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json={"username": "wrong", "password": "wrong"}
            )
            
            if response.status_code != 401:
                self.log(f"FAIL: Expected 401, got {response.status_code}", "ERROR")
                return False
                
            data = response.json()
            if data.get("error") != "Invalid credentials":
                self.log(f"FAIL: Expected 'Invalid credentials', got {data.get('error')}", "ERROR")
                return False
                
            self.log("✅ Wrong credentials test passed")
            return True
            
        except Exception as e:
            self.log(f"FAIL: Exception in wrong credentials test: {e}", "ERROR")
            return False
    
    def test_auth_correct_credentials(self) -> bool:
        """Test 2: POST /api/auth/login with CORRECT creds → expect 200 with {token, user}"""
        try:
            self.log("Testing authentication with correct credentials...")
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
            )
            
            if response.status_code != 200:
                self.log(f"FAIL: Expected 200, got {response.status_code}", "ERROR")
                self.log(f"Response: {response.text}", "ERROR")
                return False
                
            data = response.json()
            if "token" not in data or "user" not in data:
                self.log(f"FAIL: Missing token or user in response: {data}", "ERROR")
                return False
                
            self.token = data["token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            
            self.log(f"✅ Correct credentials test passed. Token: {self.token[:20]}...")
            return True
            
        except Exception as e:
            self.log(f"FAIL: Exception in correct credentials test: {e}", "ERROR")
            return False
    
    def test_teams_endpoint(self) -> bool:
        """Test 3: GET /api/teams → expect 24 teams across 8 groups (A-H, 3 each)"""
        try:
            self.log("Testing teams endpoint...")
            response = self.session.get(f"{self.base_url}/teams")
            
            if response.status_code != 200:
                self.log(f"FAIL: Expected 200, got {response.status_code}", "ERROR")
                return False
                
            data = response.json()
            teams = data.get("teams", [])
            
            if len(teams) != 24:
                self.log(f"FAIL: Expected 24 teams, got {len(teams)}", "ERROR")
                return False
                
            # Check groups A-H with 3 teams each
            groups = {}
            for team in teams:
                group = team.get("group")
                if group not in groups:
                    groups[group] = []
                groups[group].append(team)
                
            expected_groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
            for group in expected_groups:
                if group not in groups:
                    self.log(f"FAIL: Missing group {group}", "ERROR")
                    return False
                if len(groups[group]) != 3:
                    self.log(f"FAIL: Group {group} has {len(groups[group])} teams, expected 3", "ERROR")
                    return False
                    
            self.log(f"✅ Teams test passed: 24 teams across 8 groups")
            return True
            
        except Exception as e:
            self.log(f"FAIL: Exception in teams test: {e}", "ERROR")
            return False
    
    def test_matches_endpoint(self) -> bool:
        """Test 4: GET /api/matches → expect 31 matches total: 24 with type=group + 4 type=QF + 2 type=SF + 1 type=FINAL"""
        try:
            self.log("Testing matches endpoint...")
            response = self.session.get(f"{self.base_url}/matches")
            
            if response.status_code != 200:
                self.log(f"FAIL: Expected 200, got {response.status_code}", "ERROR")
                return False
                
            data = response.json()
            matches = data.get("matches", [])
            
            if len(matches) != 31:
                self.log(f"FAIL: Expected 31 matches, got {len(matches)}", "ERROR")
                return False
                
            # Count by type
            type_counts = {}
            for match in matches:
                match_type = match.get("type")
                type_counts[match_type] = type_counts.get(match_type, 0) + 1
                
            expected_counts = {"group": 24, "QF": 4, "SF": 2, "FINAL": 1}
            for match_type, expected_count in expected_counts.items():
                actual_count = type_counts.get(match_type, 0)
                if actual_count != expected_count:
                    self.log(f"FAIL: Expected {expected_count} {match_type} matches, got {actual_count}", "ERROR")
                    return False
                    
            self.log(f"✅ Matches test passed: 31 total matches with correct distribution")
            return True
            
        except Exception as e:
            self.log(f"FAIL: Exception in matches test: {e}", "ERROR")
            return False
    
    def test_standings_endpoint(self) -> bool:
        """Test 5: GET /api/standings → expect 8 groups (A-H), each with 3 teams, all stats zero initially"""
        try:
            self.log("Testing standings endpoint...")
            response = self.session.get(f"{self.base_url}/standings")
            
            if response.status_code != 200:
                self.log(f"FAIL: Expected 200, got {response.status_code}", "ERROR")
                return False
                
            data = response.json()
            standings = data.get("standings", {})
            groups = data.get("groups", {})
            
            expected_groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
            for group in expected_groups:
                if group not in standings:
                    self.log(f"FAIL: Missing group {group} in standings", "ERROR")
                    return False
                    
                group_standings = standings[group]
                if len(group_standings) != 3:
                    self.log(f"FAIL: Group {group} has {len(group_standings)} teams, expected 3", "ERROR")
                    return False
                    
                # Check initial stats are zero
                for team_stats in group_standings:
                    for stat in ['played', 'won', 'drawn', 'lost', 'gf', 'ga', 'gd', 'points']:
                        if team_stats.get(stat, 0) != 0:
                            self.log(f"FAIL: Team {team_stats.get('team')} has non-zero {stat}: {team_stats.get(stat)}", "ERROR")
                            return False
                            
            self.log(f"✅ Standings test passed: 8 groups with 3 teams each, all stats zero")
            return True
            
        except Exception as e:
            self.log(f"FAIL: Exception in standings test: {e}", "ERROR")
            return False
    
    def test_bracket_endpoint(self) -> bool:
        """Test 6: GET /api/bracket → expect {qf:[4 matches], sf:[2 matches], final:{...}, with placeholder teamA/teamB like "Winner A", "Winner H"""
        try:
            self.log("Testing bracket endpoint...")
            response = self.session.get(f"{self.base_url}/bracket")
            
            if response.status_code != 200:
                self.log(f"FAIL: Expected 200, got {response.status_code}", "ERROR")
                return False
                
            data = response.json()
            
            # Check QF matches
            qf_matches = data.get("qf", [])
            if len(qf_matches) != 4:
                self.log(f"FAIL: Expected 4 QF matches, got {len(qf_matches)}", "ERROR")
                return False
                
            # Check SF matches
            sf_matches = data.get("sf", [])
            if len(sf_matches) != 2:
                self.log(f"FAIL: Expected 2 SF matches, got {len(sf_matches)}", "ERROR")
                return False
                
            # Check final match
            final_match = data.get("final")
            if not final_match:
                self.log(f"FAIL: Missing final match", "ERROR")
                return False
                
            # Check placeholder team names
            all_matches = qf_matches + sf_matches + [final_match]
            for match in all_matches:
                team_a = match.get("teamA", "")
                team_b = match.get("teamB", "")
                if not (team_a.startswith("Winner") or team_a in ["Gangtok FC", "Dhondupling Legen", "USA"]):
                    self.log(f"FAIL: Unexpected teamA format: {team_a}", "ERROR")
                    return False
                if not (team_b.startswith("Winner") or team_b in ["Gangtok FC", "Dhondupling Legen", "USA"]):
                    self.log(f"FAIL: Unexpected teamB format: {team_b}", "ERROR")
                    return False
                    
            self.log(f"✅ Bracket test passed: 4 QF, 2 SF, 1 Final with correct placeholders")
            return True
            
        except Exception as e:
            self.log(f"FAIL: Exception in bracket test: {e}", "ERROR")
            return False
    
    def test_unauthorized_match_update(self) -> bool:
        """Test 7: PUT /api/matches/:id WITHOUT auth → expect 401 Unauthorized"""
        try:
            self.log("Testing unauthorized match update...")
            
            # First get a match ID
            response = self.session.get(f"{self.base_url}/matches?type=group&group=A")
            if response.status_code != 200:
                self.log(f"FAIL: Could not get matches for test", "ERROR")
                return False
                
            matches = response.json().get("matches", [])
            if not matches:
                self.log(f"FAIL: No matches found for test", "ERROR")
                return False
                
            match_id = matches[0]["id"]
            
            # Remove auth header temporarily
            original_auth = self.session.headers.get("Authorization")
            if "Authorization" in self.session.headers:
                del self.session.headers["Authorization"]
                
            # Try to update without auth
            response = self.session.put(
                f"{self.base_url}/matches/{match_id}",
                json={"scoreA": 2, "scoreB": 1, "status": "completed"}
            )
            
            # Restore auth header
            if original_auth:
                self.session.headers["Authorization"] = original_auth
                
            if response.status_code != 401:
                self.log(f"FAIL: Expected 401, got {response.status_code}", "ERROR")
                return False
                
            data = response.json()
            if "error" not in data or "Unauthorized" not in data["error"]:
                self.log(f"FAIL: Expected Unauthorized error, got {data}", "ERROR")
                return False
                
            self.log(f"✅ Unauthorized match update test passed")
            return True
            
        except Exception as e:
            self.log(f"FAIL: Exception in unauthorized match update test: {e}", "ERROR")
            return False
    
    def test_authorized_match_update_and_standings(self) -> bool:
        """Test 8: PUT /api/matches/:id WITH Bearer token, set scoreA=2, scoreB=1, status=completed for one match in Group A → expect 200, then GET /api/standings to verify Group A standings updated correctly"""
        try:
            self.log("Testing authorized match update and standings verification...")
            
            # Get Group A matches
            response = self.session.get(f"{self.base_url}/matches?type=group&group=A")
            if response.status_code != 200:
                self.log(f"FAIL: Could not get Group A matches", "ERROR")
                return False
                
            matches = response.json().get("matches", [])
            if not matches:
                self.log(f"FAIL: No Group A matches found", "ERROR")
                return False
                
            # Find first scheduled match
            match_to_update = None
            for match in matches:
                if match.get("status") == "scheduled":
                    match_to_update = match
                    break
                    
            if not match_to_update:
                self.log(f"FAIL: No scheduled matches found in Group A", "ERROR")
                return False
                
            match_id = match_to_update["id"]
            team_a = match_to_update["teamA"]
            team_b = match_to_update["teamB"]
            
            self.log(f"Updating match: {team_a} vs {team_b}")
            
            # Update the match
            response = self.session.put(
                f"{self.base_url}/matches/{match_id}",
                json={"scoreA": 2, "scoreB": 1, "status": "completed"}
            )
            
            if response.status_code != 200:
                self.log(f"FAIL: Expected 200, got {response.status_code}", "ERROR")
                self.log(f"Response: {response.text}", "ERROR")
                return False
                
            # Verify standings updated
            response = self.session.get(f"{self.base_url}/standings")
            if response.status_code != 200:
                self.log(f"FAIL: Could not get updated standings", "ERROR")
                return False
                
            standings_data = response.json()
            group_a_standings = standings_data.get("standings", {}).get("A", [])
            
            # Find the teams in standings
            winner_stats = None
            loser_stats = None
            for team_stats in group_a_standings:
                if team_stats["team"] == team_a:
                    winner_stats = team_stats
                elif team_stats["team"] == team_b:
                    loser_stats = team_stats
                    
            if not winner_stats or not loser_stats:
                self.log(f"FAIL: Could not find team stats in standings", "ERROR")
                return False
                
            # Verify winner stats
            if winner_stats["points"] != 3:
                self.log(f"FAIL: Winner should have 3 points, got {winner_stats['points']}", "ERROR")
                return False
            if winner_stats["won"] != 1:
                self.log(f"FAIL: Winner should have 1 win, got {winner_stats['won']}", "ERROR")
                return False
            if winner_stats["gf"] != 2 or winner_stats["ga"] != 1:
                self.log(f"FAIL: Winner GF/GA should be 2/1, got {winner_stats['gf']}/{winner_stats['ga']}", "ERROR")
                return False
                
            # Verify loser stats
            if loser_stats["points"] != 0:
                self.log(f"FAIL: Loser should have 0 points, got {loser_stats['points']}", "ERROR")
                return False
            if loser_stats["lost"] != 1:
                self.log(f"FAIL: Loser should have 1 loss, got {loser_stats['lost']}", "ERROR")
                return False
            if loser_stats["gf"] != 1 or loser_stats["ga"] != 2:
                self.log(f"FAIL: Loser GF/GA should be 1/2, got {loser_stats['gf']}/{loser_stats['ga']}", "ERROR")
                return False
                
            self.log(f"✅ Authorized match update and standings test passed")
            return True
            
        except Exception as e:
            self.log(f"FAIL: Exception in authorized match update test: {e}", "ERROR")
            return False
    
    def test_complete_group_a_and_bracket_update(self) -> bool:
        """Test 9: Complete ALL 3 matches in Group A so one team finishes 1st. Then GET /api/bracket and verify QF1.teamA = the Group A winner"""
        try:
            self.log("Testing complete Group A and bracket update...")
            
            # Get all Group A matches
            response = self.session.get(f"{self.base_url}/matches?type=group&group=A")
            if response.status_code != 200:
                self.log(f"FAIL: Could not get Group A matches", "ERROR")
                return False
                
            matches = response.json().get("matches", [])
            scheduled_matches = [m for m in matches if m.get("status") == "scheduled"]
            
            # Complete remaining matches to determine a clear winner
            # We'll make the first team in Group A win all matches
            group_a_teams = ["Gangtok FC", "Dhondupling Legen", "USA"]
            winner_team = group_a_teams[0]  # Gangtok FC
            
            for match in scheduled_matches:
                team_a = match["teamA"]
                team_b = match["teamB"]
                
                # Set scores to make Gangtok FC win
                if team_a == winner_team:
                    score_a, score_b = 3, 0
                elif team_b == winner_team:
                    score_a, score_b = 0, 3
                else:
                    # Match between other teams, make it a draw
                    score_a, score_b = 1, 1
                    
                response = self.session.put(
                    f"{self.base_url}/matches/{match['id']}",
                    json={"scoreA": score_a, "scoreB": score_b, "status": "completed"}
                )
                
                if response.status_code != 200:
                    self.log(f"FAIL: Could not update match {match['id']}", "ERROR")
                    return False
                    
            # Verify bracket updated
            response = self.session.get(f"{self.base_url}/bracket")
            if response.status_code != 200:
                self.log(f"FAIL: Could not get bracket", "ERROR")
                return False
                
            bracket_data = response.json()
            qf_matches = bracket_data.get("qf", [])
            
            # Find QF1 (should be A vs H)
            qf1 = None
            for qf in qf_matches:
                if qf.get("slot") == "QF1":
                    qf1 = qf
                    break
                    
            if not qf1:
                self.log(f"FAIL: Could not find QF1 match", "ERROR")
                return False
                
            if qf1["teamA"] != winner_team:
                self.log(f"FAIL: QF1.teamA should be {winner_team}, got {qf1['teamA']}", "ERROR")
                return False
                
            self.log(f"✅ Group A completion and bracket update test passed. QF1.teamA = {winner_team}")
            return True
            
        except Exception as e:
            self.log(f"FAIL: Exception in Group A completion test: {e}", "ERROR")
            return False
    
    def test_group_h_completion_and_bracket_update(self) -> bool:
        """Test 10: Complete enough Group H matches to determine Group H winner, verify QF1.teamB updates"""
        try:
            self.log("Testing Group H completion and bracket update...")
            
            # Get all Group H matches
            response = self.session.get(f"{self.base_url}/matches?type=group&group=H")
            if response.status_code != 200:
                self.log(f"FAIL: Could not get Group H matches", "ERROR")
                return False
                
            matches = response.json().get("matches", [])
            scheduled_matches = [m for m in matches if m.get("status") == "scheduled"]
            
            # Complete all Group H matches to determine a clear winner
            group_h_teams = ["TDL", "Canada Sangey", "Dhondenling SC"]
            winner_team = group_h_teams[0]  # TDL
            
            for match in scheduled_matches:
                team_a = match["teamA"]
                team_b = match["teamB"]
                
                # Set scores to make TDL win
                if team_a == winner_team:
                    score_a, score_b = 2, 0
                elif team_b == winner_team:
                    score_a, score_b = 0, 2
                else:
                    # Match between other teams
                    score_a, score_b = 1, 1
                    
                response = self.session.put(
                    f"{self.base_url}/matches/{match['id']}",
                    json={"scoreA": score_a, "scoreB": score_b, "status": "completed"}
                )
                
                if response.status_code != 200:
                    self.log(f"FAIL: Could not update Group H match {match['id']}", "ERROR")
                    return False
                    
            # Verify bracket updated
            response = self.session.get(f"{self.base_url}/bracket")
            if response.status_code != 200:
                self.log(f"FAIL: Could not get bracket after Group H completion", "ERROR")
                return False
                
            bracket_data = response.json()
            qf_matches = bracket_data.get("qf", [])
            
            # Find QF1 (should be A vs H)
            qf1 = None
            for qf in qf_matches:
                if qf.get("slot") == "QF1":
                    qf1 = qf
                    break
                    
            if not qf1:
                self.log(f"FAIL: Could not find QF1 match after Group H completion", "ERROR")
                return False
                
            if qf1["teamB"] != winner_team:
                self.log(f"FAIL: QF1.teamB should be {winner_team}, got {qf1['teamB']}", "ERROR")
                return False
                
            self.log(f"✅ Group H completion and bracket update test passed. QF1.teamB = {winner_team}")
            return True
            
        except Exception as e:
            self.log(f"FAIL: Exception in Group H completion test: {e}", "ERROR")
            return False
    
    def test_qf_completion_and_sf_advancement(self) -> bool:
        """Test 11: Complete QF1 by updating its match. Verify SF1.teamA = QF1 winner"""
        try:
            self.log("Testing QF completion and SF advancement...")
            
            # Get QF matches
            response = self.session.get(f"{self.base_url}/matches?type=QF")
            if response.status_code != 200:
                self.log(f"FAIL: Could not get QF matches", "ERROR")
                return False
                
            qf_matches = response.json().get("matches", [])
            
            # Find QF1
            qf1_match = None
            for match in qf_matches:
                if match.get("slot") == "QF1":
                    qf1_match = match
                    break
                    
            if not qf1_match:
                self.log(f"FAIL: Could not find QF1 match", "ERROR")
                return False
                
            if qf1_match.get("status") == "completed":
                self.log(f"QF1 already completed, skipping update")
            else:
                # Complete QF1 - make teamA win
                team_a = qf1_match["teamA"]
                team_b = qf1_match["teamB"]
                
                response = self.session.put(
                    f"{self.base_url}/matches/{qf1_match['id']}",
                    json={"scoreA": 2, "scoreB": 1, "status": "completed"}
                )
                
                if response.status_code != 200:
                    self.log(f"FAIL: Could not complete QF1", "ERROR")
                    return False
                    
            # Get updated bracket
            response = self.session.get(f"{self.base_url}/bracket")
            if response.status_code != 200:
                self.log(f"FAIL: Could not get bracket after QF1 completion", "ERROR")
                return False
                
            bracket_data = response.json()
            sf_matches = bracket_data.get("sf", [])
            
            # Find SF1
            sf1 = None
            for sf in sf_matches:
                if sf.get("slot") == "SF1":
                    sf1 = sf
                    break
                    
            if not sf1:
                self.log(f"FAIL: Could not find SF1 match", "ERROR")
                return False
                
            # Verify SF1.teamA is the QF1 winner (teamA since we made teamA win)
            expected_winner = qf1_match["teamA"]
            if sf1["teamA"] != expected_winner:
                self.log(f"FAIL: SF1.teamA should be {expected_winner}, got {sf1['teamA']}", "ERROR")
                return False
                
            self.log(f"✅ QF completion and SF advancement test passed. SF1.teamA = {expected_winner}")
            return True
            
        except Exception as e:
            self.log(f"FAIL: Exception in QF completion test: {e}", "ERROR")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all tests in sequence"""
        tests = [
            ("Auth Wrong Credentials", self.test_auth_wrong_credentials),
            ("Auth Correct Credentials", self.test_auth_correct_credentials),
            ("Teams Endpoint", self.test_teams_endpoint),
            ("Matches Endpoint", self.test_matches_endpoint),
            ("Standings Endpoint", self.test_standings_endpoint),
            ("Bracket Endpoint", self.test_bracket_endpoint),
            ("Unauthorized Match Update", self.test_unauthorized_match_update),
            ("Authorized Match Update & Standings", self.test_authorized_match_update_and_standings),
            ("Complete Group A & Bracket Update", self.test_complete_group_a_and_bracket_update),
            ("Complete Group H & Bracket Update", self.test_group_h_completion_and_bracket_update),
            ("QF Completion & SF Advancement", self.test_qf_completion_and_sf_advancement),
        ]
        
        results = {}
        passed = 0
        total = len(tests)
        
        self.log(f"Starting APFA INT GOLD CUP 2026 API Test Suite...")
        self.log(f"Base URL: {self.base_url}")
        self.log("=" * 80)
        
        for test_name, test_func in tests:
            self.log(f"\nRunning: {test_name}")
            self.log("-" * 40)
            
            try:
                result = test_func()
                results[test_name] = result
                if result:
                    passed += 1
                    self.log(f"✅ {test_name} PASSED")
                else:
                    self.log(f"❌ {test_name} FAILED")
            except Exception as e:
                self.log(f"❌ {test_name} FAILED with exception: {e}", "ERROR")
                results[test_name] = False
                
        self.log("\n" + "=" * 80)
        self.log(f"TEST SUMMARY: {passed}/{total} tests passed")
        self.log("=" * 80)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status} {test_name}")
            
        return results

def main():
    """Main test runner"""
    tester = TournamentAPITester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    failed_tests = [name for name, result in results.items() if not result]
    if failed_tests:
        print(f"\n❌ {len(failed_tests)} test(s) failed:")
        for test in failed_tests:
            print(f"  - {test}")
        sys.exit(1)
    else:
        print(f"\n✅ All tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()